import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealCreateType,
    type MealIngredientsType,
    type MealStepByStepInstructionsType,
    mealIngredientsSchema,
    mealSchema,
    mealStepByStepInstructionsSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import {
    recipeIngredients,
    recipeInstructions,
    recipes,
} from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const createMealRequestSchema = z.object({
    mealName: z
        .string()
        .min(1, "Meal name min length is 1")
        .max(100, "Meal name max length is 100"),
    scheduledToBeEatenAt: z.string().datetime().optional(),
    recipes: z
        .array(
            z.object({
                recipeId: z.string().uuid(),
            }),
        )
        .min(1)
        .max(20),
});

export function registerCreateMeal(app: Hono) {
    app.post("/", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsedJsonBody = createMealRequestSchema.safeParse(rawJsonBody);
        if (!parsedJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal data",
                    parsedJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeCreateMealJsonBody = parsedJsonBody.data;

        // Get recipe snapshots with current versions
        const recipeInstances = [];
        for (const recipeRef of safeCreateMealJsonBody.recipes) {
            const recipeFromDb = await db.query.recipes.findFirst({
                where: eq(recipes.id, recipeRef.recipeId),
            });

            if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
                return c.json(
                    ApiResponse.error(
                        `Recipe ${recipeRef.recipeId} not found or access denied`,
                    ),
                    StatusCodes.NOT_FOUND,
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

        const newMeal: MealCreateType = {
            id: crypto.randomUUID(),
            userId: safeUserId,
            mealName: safeCreateMealJsonBody.mealName,
            recipes: recipeInstances,
        };

        const createMealEvent = mealSchema.safeParse(newMeal);
        if (!createMealEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal data",
                    createMealEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeCreateMealEvent = createMealEvent.data;

        // Fetch and flatten recipe instructions for snapshot
        const allMealSteps = [];
        let globalStepNumber = 1;

        for (const recipeInstance of recipeInstances) {
            const steps = await db
                .select()
                .from(recipeInstructions)
                .where(eq(recipeInstructions.recipeId, recipeInstance.recipeId))
                .orderBy(recipeInstructions.instructionNumber);

            for (const step of steps) {
                allMealSteps.push({
                    id: crypto.randomUUID(),
                    recipeId: recipeInstance.recipeId,
                    originalRecipeInstructionId: step.id,
                    isStepCompleted: false,
                    instructionNumber: globalStepNumber++,
                    stepInstruction: step.instruction,
                    estimatedDurationMinutes: undefined, // Will be set later when planning todos
                    assignedToDate: undefined,
                    todoId: undefined,
                    foodItemUnitsUsedInStep: undefined, // Basic recipe steps don't have attached ingredients yet
                });
            }
        }

        const mealInstructions: MealStepByStepInstructionsType = {
            mealId: safeCreateMealEvent.id,
            stepByStepInstructions: allMealSteps,
        };

        // Fetch and flatten recipe ingredients for snapshot
        const allMealIngredients = [];

        for (const recipeInstance of recipeInstances) {
            const ingredients = await db
                .select()
                .from(recipeIngredients)
                .where(eq(recipeIngredients.recipeId, recipeInstance.recipeId));

            for (const ingredient of ingredients) {
                allMealIngredients.push({
                    id: crypto.randomUUID(),
                    recipeId: recipeInstance.recipeId,
                    ingredientText: ingredient.ingredientText,
                });
            }
        }

        const mealIngredients: MealIngredientsType = {
            mealId: safeCreateMealEvent.id,
            ingredients: allMealIngredients,
        };

        // Validate the instruction and ingredient events
        const instructionsEvent =
            mealStepByStepInstructionsSchema.safeParse(mealInstructions);
        const ingredientsEvent =
            mealIngredientsSchema.safeParse(mealIngredients);

        if (!instructionsEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal instructions data",
                    instructionsEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeInstructionsEvent = instructionsEvent.data;

        if (!ingredientsEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal ingredients data",
                    ingredientsEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeIngredientsEvent = ingredientsEvent.data;

        try {
            // Emit all 3 events for complete snapshot
            await FlowcorePathways.write("meal.v0/meal.created.v0", {
                data: safeCreateMealEvent,
            });

            await FlowcorePathways.write(
                "meal.v0/meal-instructions.created.v0",
                {
                    data: safeInstructionsEvent,
                },
            );

            await FlowcorePathways.write(
                "meal.v0/meal-ingredients.created.v0",
                {
                    data: safeIngredientsEvent,
                },
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to create meal", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success("Meal created successfully", {
                meal: safeCreateMealEvent,
                instructions: safeInstructionsEvent,
                ingredients: safeIngredientsEvent,
            }),
        );
    });
}
