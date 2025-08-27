import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealInstructionsArchiveType,
    mealInstructionsArchiveSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { mealSteps, meals } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const deleteMealInstructionsRequestSchema = z.object({
    mealId: z.string().uuid(),
});

export function registerDeleteMealInstructions(app: Hono) {
    app.delete("/instructions", async (c) => {
        const safeUserId = c.userId!;

        const rawRequestJsonBody = await c.req.json();
        const parsedRequestJsonBody =
            deleteMealInstructionsRequestSchema.safeParse(rawRequestJsonBody);
        if (!parsedRequestJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal instructions data",
                    parsedRequestJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeDeleteMealInstructionsRequestBody =
            parsedRequestJsonBody.data;

        // Verify meal exists and belongs to user
        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, safeDeleteMealInstructionsRequestBody.mealId),
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
                    safeDeleteMealInstructionsRequestBody.mealId,
                ),
            );

        if (existingInstructions.length === 0) {
            return c.json(
                ApiResponse.error("Meal instructions not found"),
                StatusCodes.NOT_FOUND,
            );
        }

        const mealInstructionsArchived: MealInstructionsArchiveType = {
            mealId: safeDeleteMealInstructionsRequestBody.mealId,
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
            reasonForArchiving: "User requested deletion",
        };

        const mealInstructionsArchivedEvent =
            mealInstructionsArchiveSchema.safeParse(mealInstructionsArchived);
        if (!mealInstructionsArchivedEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal instructions archived data",
                    mealInstructionsArchivedEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeMealInstructionsArchivedEvent =
            mealInstructionsArchivedEvent.data;

        try {
            await FlowcorePathways.write(
                "meal.v0/meal-instructions.archived.v0",
                {
                    data: safeMealInstructionsArchivedEvent,
                },
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to archive meal instructions", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Meal instructions archived successfully",
                safeMealInstructionsArchivedEvent,
            ),
        );
    });
}
