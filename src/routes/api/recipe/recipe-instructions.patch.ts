import { eq } from "drizzle-orm";
import z from "zod";
import {
    type RecipeInstructionsUpdateType,
    recipeInstructionsUpdateSchema,
} from "../../../contracts/food/recipe";
import type { RecipeVersionType } from "../../../contracts/food/recipe/recipe-version.contract";
import { db } from "../../../db";
import { recipeSteps, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import recipe from ".";

// client side request schema
const updateRecipeInstructionsRequestSchema = z.object({
    recipeId: z.string().uuid(),
    stepByStepInstructions: z
        .array(
            z.object({
                stepNumber: z.number().positive().int(),
                stepInstruction: z.string().min(1).max(250),
                ingredientsUsedInStep: z
                    .array(
                        z.object({
                            foodItemUnitId: z.string().uuid(),
                            foodItemId: z.string().uuid(),
                            quantityOfFoodItemUnit: z
                                .number()
                                .positive()
                                .max(1_000_000)
                                .default(1),
                        })
                    )
                    .optional(),
            })
        )
        .min(1)
        .max(30),
});

recipe.patch("/instructions", async (c) => {
    const safeUserId = c.userId!;

    const rawRequestJsonBody = await c.req.json();
    const parsedRequestJsonBody =
        updateRecipeInstructionsRequestSchema.safeParse(rawRequestJsonBody);
    if (!parsedRequestJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe instructions data",
                parsedRequestJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUpdateRecipeInstructionsRequestBody = parsedRequestJsonBody.data;

    // Verify recipe exists and belongs to user
    const recipeFromDb = await db.query.recipes.findFirst({
        where: eq(recipes.id, safeUpdateRecipeInstructionsRequestBody.recipeId),
    });

    if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
        return c.json(
            ApiResponse.error("Recipe not found or access denied"),
            StatusCodes.NOT_FOUND
        );
    }

    const recipeVersion = recipeFromDb.version;
    const newRecipeVersion = recipeVersion + 1;

    // Get existing instructions
    const existingInstructions = await db
        .select()
        .from(recipeSteps)
        .where(
            eq(
                recipeSteps.recipeId,
                safeUpdateRecipeInstructionsRequestBody.recipeId
            )
        );

    if (existingInstructions.length === 0) {
        return c.json(
            ApiResponse.error("Recipe instructions not found"),
            StatusCodes.NOT_FOUND
        );
    }

    // Build old values for the event (simplified structure)
    const oldInstructions = {
        recipeId: safeUpdateRecipeInstructionsRequestBody.recipeId,
        stepByStepInstructions: existingInstructions.map((step) => ({
            id: step.id,
            stepNumber: step.stepNumber,
            stepInstruction: step.instruction,
            ingredientsUsedInStep: [], // Simplified - would need to fetch from recipeStepIngredients
        })),
    };

    const updatedRecipeInstructions: RecipeInstructionsUpdateType = {
        recipeId: safeUpdateRecipeInstructionsRequestBody.recipeId,
        stepByStepInstructions:
            safeUpdateRecipeInstructionsRequestBody.stepByStepInstructions.map(
                (step) => ({
                    id: crypto.randomUUID(),
                    stepNumber: step.stepNumber,
                    stepInstruction: step.stepInstruction,
                    ingredientsUsedInStep: step.ingredientsUsedInStep,
                })
            ),
        oldValues: oldInstructions,
    };

    const updateRecipeInstructionsEvent =
        recipeInstructionsUpdateSchema.safeParse(updatedRecipeInstructions);
    if (!updateRecipeInstructionsEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe instructions data",
                updateRecipeInstructionsEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUpdateRecipeInstructionsEvent =
        updateRecipeInstructionsEvent.data;

    try {
        await FlowcorePathways.write(
            "recipe.v0/recipe-instructions.updated.v0",
            {
                data: safeUpdateRecipeInstructionsEvent,
            }
        );
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to update recipe instructions", error),
            StatusCodes.SERVER_ERROR
        );
    }

    const recipeVersionEvent: RecipeVersionType = {
        recipeId: recipeFromDb.id,
        version: newRecipeVersion,
    };

    try {
        await FlowcorePathways.write("recipe.v0/recipe-version.v0", {
            data: recipeVersionEvent,
        });
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to update recipe version", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success(
            "Recipe instructions updated successfully",
            safeUpdateRecipeInstructionsEvent
        )
    );
});

export default recipe;
