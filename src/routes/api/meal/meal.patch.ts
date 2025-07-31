import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealIngredientsUpdateType,
    type MealInstructionsUpdateType,
    type MealUpdateType,
    mealIngredientsUpdateSchema,
    mealInstructionsUpdateSchema,
    mealUpdateSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import {
    mealIngredients,
    mealSteps,
    meals,
    recipeIngredients,
    recipeSteps,
    recipes,
} from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const updateMealRequestSchema = z.object({
    mealName: z
        .string()
        .min(1, "Meal name min length is 1")
        .max(100, "Meal name max length is 100"),
    scheduledToBeEatenAt: z.string().datetime().optional(),
    recipes: z
        .array(
            z.object({
                recipeId: z.string().uuid(),
            })
        )
        .min(1)
        .max(20),
});

export function registerPatchMeal(app: Hono) {
    app.patch("/", async (c) => {
        const safeUserId = c.userId!;

        const rawRequestJsonBody = await c.req.json();
        const parsedRequestJsonBody =
            updateMealRequestSchema.safeParse(rawRequestJsonBody);
        if (!parsedRequestJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal data",
                    parsedRequestJsonBody.error.errors
                ),
                StatusCodes.BAD_REQUEST
            );
        }
        const safeUpdateMealRequestBody = parsedRequestJsonBody.data;

        const mealFromDb = await db.query.meals.findFirst({
            where: and(
                eq(meals.mealName, safeUpdateMealRequestBody.mealName),
                eq(meals.userId, safeUserId)
            ),
        });
        if (!mealFromDb) {
            return c.json(
                ApiResponse.error("Meal not found"),
                StatusCodes.NOT_FOUND
            );
        }

        // Get recipe snapshots with current versions
        const recipeInstances = [];
        for (const recipeRef of safeUpdateMealRequestBody.recipes) {
            const recipeFromDb = await db.query.recipes.findFirst({
                where: eq(recipes.id, recipeRef.recipeId),
            });

            if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
                return c.json(
                    ApiResponse.error(
                        `Recipe ${recipeRef.recipeId} not found or access denied`
                    ),
                    StatusCodes.NOT_FOUND
                );
            }

            recipeInstances.push({
                recipeId: recipeRef.recipeId,
                recipeName: recipeFromDb.nameOfTheRecipe,
                recipeDescription:
                    recipeFromDb.generalDescriptionOfTheRecipe || "",
                recipeVersion: recipeFromDb.version,
            });
        }

        const updatedMeal: MealUpdateType = {
            id: mealFromDb.id,
            userId: safeUserId,
            mealName: safeUpdateMealRequestBody.mealName,
            scheduledToBeEatenAt:
                safeUpdateMealRequestBody.scheduledToBeEatenAt,
            hasMealBeenConsumed: mealFromDb.hasMealBeenConsumed,
            recipes: recipeInstances,
            oldValues: {
                id: mealFromDb.id,
                userId: mealFromDb.userId,
                mealName: mealFromDb.mealName,
                scheduledToBeEatenAt:
                    mealFromDb.scheduledToBeEatenAt?.toISOString(),
                hasMealBeenConsumed: mealFromDb.hasMealBeenConsumed,
                recipes: JSON.parse(mealFromDb.recipes).map((recipe: any) => ({
                    ...recipe,
                    recipeDescription: recipe.recipeDescription || "",
                })),
            },
        };

        const updateMealEvent = mealUpdateSchema.safeParse(updatedMeal);
        if (!updateMealEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal data",
                    updateMealEvent.error.errors
                ),
                StatusCodes.BAD_REQUEST
            );
        }
        const safeUpdateMealEvent = updateMealEvent.data;

        // Get existing meal instructions and ingredients for oldValues
        const existingMealSteps = await db
            .select()
            .from(mealSteps)
            .where(eq(mealSteps.mealId, mealFromDb.id))
            .orderBy(mealSteps.stepNumber);

        const existingMealIngredients = await db
            .select()
            .from(mealIngredients)
            .where(eq(mealIngredients.mealId, mealFromDb.id))
            .orderBy(mealIngredients.sortOrder);

        // Generate new instructions from updated recipe list
        const allMealSteps = [];
        let globalStepNumber = 1;

        for (const recipeInstance of recipeInstances) {
            const steps = await db
                .select()
                .from(recipeSteps)
                .where(eq(recipeSteps.recipeId, recipeInstance.recipeId))
                .orderBy(recipeSteps.stepNumber);

            for (const step of steps) {
                allMealSteps.push({
                    id: crypto.randomUUID(),
                    recipeId: recipeInstance.recipeId,
                    originalRecipeStepId: step.id,
                    isStepCompleted: false,
                    stepNumber: globalStepNumber++,
                    stepInstruction: step.instruction,
                    estimatedDurationMinutes: undefined,
                    assignedToDate: undefined,
                    todoId: undefined,
                    ingredientsUsedInStep: undefined,
                });
            }
        }

        // Generate new ingredients from updated recipe list
        const allMealIngredients = [];
        let globalSortOrder = 1;

        for (const recipeInstance of recipeInstances) {
            const ingredients = await db
                .select()
                .from(recipeIngredients)
                .where(eq(recipeIngredients.recipeId, recipeInstance.recipeId))
                .orderBy(recipeIngredients.sortOrder);

            for (const ingredient of ingredients) {
                allMealIngredients.push({
                    id: crypto.randomUUID(),
                    recipeId: recipeInstance.recipeId,
                    ingredientText: ingredient.ingredientText,
                    sortOrder: globalSortOrder++,
                });
            }
        }

        const updatedMealInstructions: MealInstructionsUpdateType = {
            mealId: mealFromDb.id,
            stepByStepInstructions: allMealSteps,
            oldValues: {
                mealId: mealFromDb.id,
                stepByStepInstructions: existingMealSteps.map((step) => ({
                    id: step.id,
                    recipeId: step.recipeId,
                    originalRecipeStepId: step.originalRecipeStepId,
                    isStepCompleted: step.isStepCompleted,
                    stepNumber: step.stepNumber,
                    stepInstruction: step.instruction,
                    estimatedDurationMinutes:
                        step.estimatedDurationMinutes || undefined,
                    assignedToDate: step.assignedToDate || undefined,
                    todoId: step.todoId || undefined,
                    ingredientsUsedInStep: step.ingredientsUsedInStep
                        ? JSON.parse(step.ingredientsUsedInStep)
                        : undefined,
                })),
            },
        };

        const updatedMealIngredients: MealIngredientsUpdateType = {
            mealId: mealFromDb.id,
            ingredients: allMealIngredients,
            oldValues: {
                mealId: mealFromDb.id,
                ingredients: existingMealIngredients.map((ingredient) => ({
                    id: ingredient.id,
                    recipeId: ingredient.recipeId,
                    ingredientText: ingredient.ingredientText,
                    sortOrder: ingredient.sortOrder,
                })),
            },
        };

        // Validate the events
        const instructionsUpdateEvent = mealInstructionsUpdateSchema.safeParse(
            updatedMealInstructions
        );
        const ingredientsUpdateEvent = mealIngredientsUpdateSchema.safeParse(
            updatedMealIngredients
        );

        if (!instructionsUpdateEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal instructions data",
                    instructionsUpdateEvent.error.errors
                ),
                StatusCodes.BAD_REQUEST
            );
        }

        if (!ingredientsUpdateEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal ingredients data",
                    ingredientsUpdateEvent.error.errors
                ),
                StatusCodes.BAD_REQUEST
            );
        }

        try {
            // Emit all 3 update events when recipes change
            await FlowcorePathways.write("meal.v0/meal.updated.v0", {
                data: safeUpdateMealEvent,
            });

            await FlowcorePathways.write(
                "meal.v0/meal-instructions.updated.v0",
                {
                    data: instructionsUpdateEvent.data,
                }
            );

            await FlowcorePathways.write(
                "meal.v0/meal-ingredients.updated.v0",
                {
                    data: ingredientsUpdateEvent.data,
                }
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to update meal", error),
                StatusCodes.SERVER_ERROR
            );
        }

        return c.json(
            ApiResponse.success("Meal updated successfully", {
                meal: safeUpdateMealEvent,
                instructions: instructionsUpdateEvent.data,
                ingredients: ingredientsUpdateEvent.data,
            })
        );
    });
}
