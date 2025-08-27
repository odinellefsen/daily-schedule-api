import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealInstructionsUpdateType,
    mealInstructionsUpdateSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { mealSteps, meals } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const updateMealInstructionsRequestSchema = z.object({
    mealId: z.string().uuid(),
    stepByStepInstructions: z.array(
        z.object({
            id: z.string().uuid(),
            stepNumber: z.number().int(),
            stepInstruction: z.string().min(1).max(250),
            isStepCompleted: z.boolean().default(false),
            estimatedDurationMinutes: z.number().int().positive().optional(),
            assignedToDate: z.string().date().optional(),
            todoId: z.string().uuid().optional(),
        }),
    ),
});

export function registerPatchMealInstructions(app: Hono) {
    app.patch("/instructions", async (c) => {
        const safeUserId = c.userId!;

        const rawRequestJsonBody = await c.req.json();
        const parsedRequestJsonBody =
            updateMealInstructionsRequestSchema.safeParse(rawRequestJsonBody);
        if (!parsedRequestJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal instructions data",
                    parsedRequestJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeUpdateMealInstructionsRequestBody =
            parsedRequestJsonBody.data;

        // Verify meal exists and belongs to user
        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, safeUpdateMealInstructionsRequestBody.mealId),
        });

        if (!mealFromDb || mealFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Meal not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        // Get existing instructions
        const existingInstructions = await db
            .select()
            .from(mealSteps)
            .where(
                eq(
                    mealSteps.mealId,
                    safeUpdateMealInstructionsRequestBody.mealId,
                ),
            );

        if (existingInstructions.length === 0) {
            return c.json(
                ApiResponse.error("Meal instructions not found"),
                StatusCodes.NOT_FOUND,
            );
        }

        // Build old values for the event
        const oldInstructions = {
            mealId: safeUpdateMealInstructionsRequestBody.mealId,
            stepByStepInstructions: existingInstructions.map((step) => ({
                id: step.id,
                recipeId: step.recipeId ?? undefined,
                originalRecipeStepId: step.originalRecipeStepId ?? undefined,
                isStepCompleted: step.isStepCompleted,
                stepNumber: step.stepNumber,
                stepInstruction: step.instruction,
                estimatedDurationMinutes:
                    step.estimatedDurationMinutes || undefined,
                assignedToDate: step.assignedToDate || undefined,
                todoId: step.todoId || undefined,
                foodItemUnitsUsedInStep: step.foodItemUnitsUsedInStep
                    ? JSON.parse(step.foodItemUnitsUsedInStep)
                    : undefined,
            })),
        };

        const updatedMealInstructions: MealInstructionsUpdateType = {
            mealId: safeUpdateMealInstructionsRequestBody.mealId,
            stepByStepInstructions:
                safeUpdateMealInstructionsRequestBody.stepByStepInstructions.map(
                    (step) => {
                        const existingStep = existingInstructions.find(
                            (existing) => existing.id === step.id,
                        );
                        return {
                            id: step.id,
                            recipeId: existingStep?.recipeId || "",
                            originalRecipeStepId:
                                existingStep?.originalRecipeStepId || "",
                            isStepCompleted: step.isStepCompleted,
                            stepNumber: step.stepNumber,
                            stepInstruction: step.stepInstruction,
                            estimatedDurationMinutes:
                                step.estimatedDurationMinutes,
                            foodItemUnitsUsedInStep: undefined,
                        };
                    },
                ),
            oldValues: oldInstructions,
        };

        const updateMealInstructionsEvent =
            mealInstructionsUpdateSchema.safeParse(updatedMealInstructions);
        if (!updateMealInstructionsEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal instructions data",
                    updateMealInstructionsEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeUpdateMealInstructionsEvent =
            updateMealInstructionsEvent.data;

        try {
            await FlowcorePathways.write(
                "meal.v0/meal-instructions.updated.v0",
                {
                    data: safeUpdateMealInstructionsEvent,
                },
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to update meal instructions", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Meal instructions updated successfully",
                safeUpdateMealInstructionsEvent,
            ),
        );
    });
}
