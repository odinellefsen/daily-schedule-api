import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    mealInstructionsArchiveSchema,
    mealInstructionsUpdateSchema,
    mealStepByStepInstructionsSchema,
} from "../../contracts/food/meal";
import { db } from "../../db";
import { mealSteps } from "../../db/schemas";

export async function handleMealInstructionsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealStepByStepInstructionsSchema>;
    },
) {
    const { payload } = event;

    // Insert meal steps
    for (const step of payload.stepByStepInstructions) {
        await db.insert(mealSteps).values({
            id: step.id,
            mealId: payload.mealId,
            recipeId: step.recipeId,
            originalRecipeStepId: step.originalRecipeStepId,
            instruction: step.stepInstruction,
            stepNumber: step.stepNumber,
            isStepCompleted: step.isStepCompleted,
            estimatedDurationMinutes: step.estimatedDurationMinutes,
            assignedToDate: step.assignedToDate,
            foodItemUnitsUsedInStep: step.foodItemUnitsUsedInStep
                ? JSON.stringify(step.foodItemUnitsUsedInStep)
                : null,
        });
    }
}

export async function handleMealInstructionsUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealInstructionsUpdateSchema>;
    },
) {
    const { payload } = event;

    // Delete existing steps
    await db.delete(mealSteps).where(eq(mealSteps.mealId, payload.mealId));

    // Insert updated steps
    for (const step of payload.stepByStepInstructions) {
        await db.insert(mealSteps).values({
            id: step.id,
            mealId: payload.mealId,
            recipeId: step.recipeId,
            originalRecipeStepId: step.originalRecipeStepId,
            instruction: step.stepInstruction,
            stepNumber: step.stepNumber,
            isStepCompleted: step.isStepCompleted,
            estimatedDurationMinutes: step.estimatedDurationMinutes,
            assignedToDate: step.assignedToDate,
            foodItemUnitsUsedInStep: step.foodItemUnitsUsedInStep
                ? JSON.stringify(step.foodItemUnitsUsedInStep)
                : null,
        });
    }
}

export async function handleMealInstructionsArchived(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealInstructionsArchiveSchema>;
    },
) {
    const { payload } = event;

    // Delete meal steps
    await db.delete(mealSteps).where(eq(mealSteps.mealId, payload.mealId));
}
