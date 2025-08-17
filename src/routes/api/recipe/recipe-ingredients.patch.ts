import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type RecipeIngredientsUpdateType,
    recipeIngredientsUpdateSchema,
} from "../../../contracts/food/recipe";
import {
    type RecipeVersionType,
    whatTriggeredVersionUpate,
} from "../../../contracts/food/recipe/recipe-version.contract";
import { db } from "../../../db";
import { recipeIngredients, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const updateRecipeIngredientsRequestSchema = z.object({
    recipeId: z.string().uuid(),
    ingredients: z
        .array(
            z.object({
                ingredientText: z.string().min(1).max(150),
            }),
        )
        .min(1)
        .max(50),
});

export function registerPatchRecipeIngredients(app: Hono) {
    app.patch("/ingredients", async (c) => {
        const safeUserId = c.userId!;

        const rawRequestJsonBody = await c.req.json();
        const parsedRequestJsonBody =
            updateRecipeIngredientsRequestSchema.safeParse(rawRequestJsonBody);
        if (!parsedRequestJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid recipe ingredients data",
                    parsedRequestJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeUpdateRecipeIngredientsRequestBody =
            parsedRequestJsonBody.data;

        // Verify recipe exists and belongs to user
        const recipeFromDb = await db.query.recipes.findFirst({
            where: eq(
                recipes.id,
                safeUpdateRecipeIngredientsRequestBody.recipeId,
            ),
        });

        if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Recipe not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        const recipeVersion = recipeFromDb.version;
        const newRecipeVersion = recipeVersion + 1;

        // Get existing ingredients
        const existingIngredients = await db
            .select()
            .from(recipeIngredients)
            .where(
                eq(
                    recipeIngredients.recipeId,
                    safeUpdateRecipeIngredientsRequestBody.recipeId,
                ),
            );

        if (existingIngredients.length === 0) {
            return c.json(
                ApiResponse.error("Recipe ingredients not found"),
                StatusCodes.NOT_FOUND,
            );
        }

        // Build old values for the event
        const oldIngredients = {
            recipeId: safeUpdateRecipeIngredientsRequestBody.recipeId,
            ingredients: existingIngredients.map((ingredient) => ({
                id: ingredient.id,
                ingredientText: ingredient.ingredientText,
            })),
        };

        const updatedRecipeIngredients: RecipeIngredientsUpdateType = {
            recipeId: safeUpdateRecipeIngredientsRequestBody.recipeId,
            ingredients: safeUpdateRecipeIngredientsRequestBody.ingredients.map(
                (ingredient) => ({
                    id: crypto.randomUUID(),
                    ingredientText: ingredient.ingredientText,
                }),
            ),
            oldValues: oldIngredients,
        };

        const updateRecipeIngredientsEvent =
            recipeIngredientsUpdateSchema.safeParse(updatedRecipeIngredients);
        if (!updateRecipeIngredientsEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid recipe ingredients data",
                    updateRecipeIngredientsEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeUpdateRecipeIngredientsEvent =
            updateRecipeIngredientsEvent.data;

        try {
            await FlowcorePathways.write(
                "recipe.v0/recipe-ingredients.updated.v0",
                {
                    data: safeUpdateRecipeIngredientsEvent,
                },
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to update recipe ingredients", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        const recipeVersionEvent: RecipeVersionType = {
            recipeId: recipeFromDb.id,
            version: newRecipeVersion,
            whatTriggeredUpdate: whatTriggeredVersionUpate.recipeIngredients,
        };

        try {
            await FlowcorePathways.write("recipe.v0/recipe-version.v0", {
                data: recipeVersionEvent,
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to update recipe version", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Recipe ingredients updated successfully",
                safeUpdateRecipeIngredientsEvent,
            ),
        );
    });
}
