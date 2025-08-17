import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    recipeInstructionsArchiveSchema,
    recipeInstructionsSchema,
    recipeInstructionsUpdateSchema,
} from "../../contracts/food/recipe";
import type { recipeVersionSchema } from "../../contracts/food/recipe/recipe-version.contract";
import { db } from "../../db";
import {
    recipeStepFoodItemUnits,
    recipeSteps,
    recipes,
} from "../../db/schemas";

export async function handleRecipeInstructionsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeInstructionsSchema>;
    },
) {
    const { payload } = event;

    // Insert recipe steps
    for (const step of payload.stepByStepInstructions) {
        await db.insert(recipeSteps).values({
            id: step.id,
            recipeId: payload.recipeId,
            instruction: step.stepInstruction,
            stepNumber: step.stepNumber,
        });

        // Insert food item units for this step if they exist
        if (step.foodItemUnitsUsedInStep) {
            for (const foodItemUnit of step.foodItemUnitsUsedInStep) {
                await db.insert(recipeStepFoodItemUnits).values({
                    id: crypto.randomUUID(),
                    recipeStepId: step.id,
                    foodItemUnitId: foodItemUnit.foodItemUnitId,
                    quantity: foodItemUnit.quantityOfFoodItemUnit,
                });
            }
        }
    }
}

export async function handleRecipeInstructionsUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeInstructionsUpdateSchema>;
    },
) {
    const { payload } = event;

    // Delete existing steps and ingredients
    const existingSteps = await db
        .select()
        .from(recipeSteps)
        .where(eq(recipeSteps.recipeId, payload.recipeId));

    for (const step of existingSteps) {
        await db
            .delete(recipeStepFoodItemUnits)
            .where(eq(recipeStepFoodItemUnits.recipeStepId, step.id));
    }
    await db
        .delete(recipeSteps)
        .where(eq(recipeSteps.recipeId, payload.recipeId));

    // Insert updated steps
    for (const step of payload.stepByStepInstructions) {
        await db.insert(recipeSteps).values({
            id: step.id,
            recipeId: payload.recipeId,
            instruction: step.stepInstruction,
            stepNumber: step.stepNumber,
        });

        // Insert food item units for this step if they exist
        if (step.foodItemUnitsUsedInStep) {
            for (const foodItemUnit of step.foodItemUnitsUsedInStep) {
                await db.insert(recipeStepFoodItemUnits).values({
                    id: crypto.randomUUID(),
                    recipeStepId: step.id,
                    foodItemUnitId: foodItemUnit.foodItemUnitId,
                    quantity: foodItemUnit.quantityOfFoodItemUnit,
                });
            }
        }
    }
}

export async function handleRecipeInstructionsArchived(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeInstructionsArchiveSchema>;
    },
) {
    const { payload } = event;

    // Delete ingredients first (foreign key constraint)
    const existingSteps = await db
        .select()
        .from(recipeSteps)
        .where(eq(recipeSteps.recipeId, payload.recipeId));

    for (const step of existingSteps) {
        await db
            .delete(recipeStepFoodItemUnits)
            .where(eq(recipeStepFoodItemUnits.recipeStepId, step.id));
    }

    // Delete recipe steps
    await db
        .delete(recipeSteps)
        .where(eq(recipeSteps.recipeId, payload.recipeId));
}

export async function handleRecipeInstructionsVersionUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeVersionSchema>;
    },
) {
    const { payload } = event;

    // Update recipe version
    await db
        .update(recipes)
        .set({
            version: payload.version,
        })
        .where(eq(recipes.id, payload.recipeId));
}
