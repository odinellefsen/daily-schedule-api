import type { FlowcoreEvent } from "@flowcore/pathways";
import type { z } from "zod";
import type { recipeInstructionsSchema } from "../../contracts/food/recipe";
import { db } from "../../db";
import {
    recipeInstructionFoodItemUnits,
    recipeInstructions,
} from "../../db/schemas";

export async function handleRecipeInstructionsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeInstructionsSchema>;
    },
) {
    const { payload } = event;

    // Insert recipe steps
    for (const step of payload.stepByStepInstructions) {
        await db.insert(recipeInstructions).values({
            id: step.id,
            recipeId: payload.recipeId,
            instruction: step.stepInstruction,
            instructionNumber: step.instructionNumber,
        });

        if (step.foodItemUnitsUsedInStep) {
            for (const foodItemUnit of step.foodItemUnitsUsedInStep) {
                await db.insert(recipeInstructionFoodItemUnits).values({
                    id: crypto.randomUUID(),
                    recipeInstructionId: step.id,
                    foodItemUnitId: foodItemUnit.foodItemUnitId,
                    quantity: foodItemUnit.quantityOfFoodItemUnit,
                });
            }
        }
    }
}
