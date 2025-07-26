import { eq } from "drizzle-orm";
import z from "zod";
import {
    type RecipeInstructionsType,
    recipeInstructionsSchema,
} from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { recipeSteps, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import recipe from ".";

// client side request schema
const createRecipeInstructionsRequestSchema = z.object({
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

recipe.post("/instructions", async (c) => {
    const safeUserId = c.userId!;

    const rawJsonBody = await c.req.json();
    const parsedJsonBody =
        createRecipeInstructionsRequestSchema.safeParse(rawJsonBody);
    if (!parsedJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe instructions data",
                parsedJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateRecipeInstructionsJsonBody = parsedJsonBody.data;

    // Verify recipe exists and belongs to user
    const recipeFromDb = await db.query.recipes.findFirst({
        where: eq(recipes.id, safeCreateRecipeInstructionsJsonBody.recipeId),
    });

    if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
        return c.json(
            ApiResponse.error("Recipe not found or access denied"),
            StatusCodes.NOT_FOUND
        );
    }

    // Check if instructions already exist
    const existingInstructions = await db
        .select()
        .from(recipeSteps)
        .where(
            eq(
                recipeSteps.recipeId,
                safeCreateRecipeInstructionsJsonBody.recipeId
            )
        );

    if (existingInstructions.length > 0) {
        return c.json(
            ApiResponse.error("Recipe instructions already exist"),
            StatusCodes.CONFLICT
        );
    }

    const newRecipeInstructions: RecipeInstructionsType = {
        recipeId: safeCreateRecipeInstructionsJsonBody.recipeId,
        stepByStepInstructions:
            safeCreateRecipeInstructionsJsonBody.stepByStepInstructions.map(
                (step) => ({
                    id: crypto.randomUUID(),
                    stepNumber: step.stepNumber,
                    stepInstruction: step.stepInstruction,
                    ingredientsUsedInStep: step.ingredientsUsedInStep,
                })
            ),
    };

    const createRecipeInstructionsEvent = recipeInstructionsSchema.safeParse(
        newRecipeInstructions
    );
    if (!createRecipeInstructionsEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe instructions data",
                createRecipeInstructionsEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateRecipeInstructionsEvent =
        createRecipeInstructionsEvent.data;

    try {
        await FlowcorePathways.write(
            "recipe.v0/recipe-instructions.created.v0",
            {
                data: safeCreateRecipeInstructionsEvent,
            }
        );
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to create recipe instructions", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success(
            "Recipe instructions created successfully",
            safeCreateRecipeInstructionsEvent
        )
    );
});

export default recipe;
