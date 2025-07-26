import { eq } from "drizzle-orm";
import z from "zod";
import {
    type RecipeInstructionsArchiveType,
    recipeInstructionsArchiveSchema,
} from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { recipeSteps, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import { recipe } from ".";

// client side request schema
const deleteRecipeInstructionsRequestSchema = z.object({
    recipeId: z.string().uuid(),
});

recipe.delete("/instructions", async (c) => {
    const safeUserId = c.userId!;

    const rawRequestJsonBody = await c.req.json();
    const parsedRequestJsonBody =
        deleteRecipeInstructionsRequestSchema.safeParse(rawRequestJsonBody);
    if (!parsedRequestJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe instructions data",
                parsedRequestJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeDeleteRecipeInstructionsRequestBody = parsedRequestJsonBody.data;

    // Verify recipe exists and belongs to user
    const recipeFromDb = await db.query.recipes.findFirst({
        where: eq(recipes.id, safeDeleteRecipeInstructionsRequestBody.recipeId),
    });

    if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
        return c.json(
            ApiResponse.error("Recipe not found or access denied"),
            StatusCodes.NOT_FOUND
        );
    }

    // Get existing instructions
    const existingInstructions = await db
        .select()
        .from(recipeSteps)
        .where(
            eq(
                recipeSteps.recipeId,
                safeDeleteRecipeInstructionsRequestBody.recipeId
            )
        );

    if (existingInstructions.length === 0) {
        return c.json(
            ApiResponse.error("Recipe instructions not found"),
            StatusCodes.NOT_FOUND
        );
    }

    const recipeInstructionsArchived: RecipeInstructionsArchiveType = {
        recipeId: safeDeleteRecipeInstructionsRequestBody.recipeId,
        stepByStepInstructions: existingInstructions.map((step) => ({
            id: step.id,
            stepNumber: step.stepNumber,
            stepInstruction: step.instruction,
            ingredientsUsedInStep: [], // Simplified - would need to fetch from recipeStepIngredients
        })),
        reasonForArchiving: "User requested deletion",
    };

    const recipeInstructionsArchivedEvent =
        recipeInstructionsArchiveSchema.safeParse(recipeInstructionsArchived);
    if (!recipeInstructionsArchivedEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe instructions archived data",
                recipeInstructionsArchivedEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeRecipeInstructionsArchivedEvent =
        recipeInstructionsArchivedEvent.data;

    try {
        await FlowcorePathways.write(
            "recipe.v0/recipe-instructions.archived.v0",
            {
                data: safeRecipeInstructionsArchivedEvent,
            }
        );
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to archive recipe instructions", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success(
            "Recipe instructions archived successfully",
            safeRecipeInstructionsArchivedEvent
        )
    );
});
