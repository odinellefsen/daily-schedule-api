import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type RecipeIngredientsArchiveType,
    recipeIngredientsArchiveSchema,
} from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { recipeIngredients, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const deleteRecipeIngredientsRequestSchema = z.object({
    recipeId: z.string().uuid(),
});

export function registerDeleteRecipeIngredients(app: Hono) {
    app.delete("/ingredients", async (c) => {
        const safeUserId = c.userId!;

        const rawRequestJsonBody = await c.req.json();
        const parsedRequestJsonBody =
            deleteRecipeIngredientsRequestSchema.safeParse(rawRequestJsonBody);
        if (!parsedRequestJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid recipe ingredients data",
                    parsedRequestJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeDeleteRecipeIngredientsRequestBody =
            parsedRequestJsonBody.data;

        // Verify recipe exists and belongs to user
        const recipeFromDb = await db.query.recipes.findFirst({
            where: eq(
                recipes.id,
                safeDeleteRecipeIngredientsRequestBody.recipeId,
            ),
        });

        if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Recipe not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        // Get existing ingredients
        const existingIngredients = await db
            .select()
            .from(recipeIngredients)
            .where(
                eq(
                    recipeIngredients.recipeId,
                    safeDeleteRecipeIngredientsRequestBody.recipeId,
                ),
            );

        if (existingIngredients.length === 0) {
            return c.json(
                ApiResponse.error("Recipe ingredients not found"),
                StatusCodes.NOT_FOUND,
            );
        }

        const recipeIngredientsArchived: RecipeIngredientsArchiveType = {
            recipeId: safeDeleteRecipeIngredientsRequestBody.recipeId,
            ingredients: existingIngredients.map((ingredient) => ({
                id: ingredient.id,
                ingredientText: ingredient.ingredientText,
            })),
            reasonForArchiving: "User requested deletion",
        };

        const recipeIngredientsArchivedEvent =
            recipeIngredientsArchiveSchema.safeParse(recipeIngredientsArchived);
        if (!recipeIngredientsArchivedEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid recipe ingredients archived data",
                    recipeIngredientsArchivedEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeRecipeIngredientsArchivedEvent =
            recipeIngredientsArchivedEvent.data;

        try {
            await FlowcorePathways.write(
                "recipe.v0/recipe-ingredients.archived.v0",
                {
                    data: safeRecipeIngredientsArchivedEvent,
                },
            );
        } catch (error) {
            return c.json(
                ApiResponse.error(
                    "Failed to archive recipe ingredients",
                    error,
                ),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Recipe ingredients archived successfully",
                safeRecipeIngredientsArchivedEvent,
            ),
        );
    });
}
