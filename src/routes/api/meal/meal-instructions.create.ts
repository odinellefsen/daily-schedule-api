import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealStepByStepInstructionsType,
    mealStepByStepInstructionsSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { mealSteps, meals, recipeSteps } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const createMealInstructionsRequestSchema = z.object({
    mealId: z.string().uuid(),
});

export function registerCreateMealInstructions(app: Hono) {
    app.post("/instructions", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsedJsonBody =
            createMealInstructionsRequestSchema.safeParse(rawJsonBody);
        if (!parsedJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal instructions data",
                    parsedJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeCreateMealInstructionsJsonBody = parsedJsonBody.data;

        // Verify meal exists and belongs to user
        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, safeCreateMealInstructionsJsonBody.mealId),
        });

        if (!mealFromDb || mealFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Meal not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        // Check if instructions already exist
        const existingInstructions = await db
            .select()
            .from(mealSteps)
            .where(
                eq(mealSteps.mealId, safeCreateMealInstructionsJsonBody.mealId),
            );

        if (existingInstructions.length > 0) {
            return c.json(
                ApiResponse.error("Meal instructions already exist"),
                StatusCodes.CONFLICT,
            );
        }

        // Generate meal instructions from recipe instances
        const recipes = JSON.parse(mealFromDb.recipes);
        const allSteps = [];
        let globalStepNumber = 1;

        for (const recipeInstance of recipes) {
            // Get recipe instructions for this recipe
            const recipeInstructions = await db
                .select()
                .from(recipeSteps)
                .where(eq(recipeSteps.recipeId, recipeInstance.recipeId))
                .orderBy(recipeSteps.stepNumber);

            for (const step of recipeInstructions) {
                allSteps.push({
                    id: crypto.randomUUID(),
                    recipeId: recipeInstance.recipeId,
                    originalRecipeStepId: step.id,
                    isStepCompleted: false,
                    stepNumber: globalStepNumber++,
                    stepInstruction: step.instruction,
                    estimatedDurationMinutes: undefined,
                    assignedToDate: undefined,
                    todoId: undefined,
                    foodItemUnitsUsedInStep: undefined,
                });
            }
        }

        const newMealInstructions: MealStepByStepInstructionsType = {
            mealId: safeCreateMealInstructionsJsonBody.mealId,
            stepByStepInstructions: allSteps,
        };

        const createMealInstructionsEvent =
            mealStepByStepInstructionsSchema.safeParse(newMealInstructions);
        if (!createMealInstructionsEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal instructions data",
                    createMealInstructionsEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeCreateMealInstructionsEvent =
            createMealInstructionsEvent.data;

        try {
            await FlowcorePathways.write(
                "meal.v0/meal-instructions.created.v0",
                {
                    data: safeCreateMealInstructionsEvent,
                },
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to create meal instructions", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Meal instructions created successfully",
                safeCreateMealInstructionsEvent,
            ),
        );
    });
}
