import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    recipeIngredientsArchiveSchema,
    recipeIngredientsSchema,
    recipeIngredientsUpdateSchema,
} from "../../contracts/food/recipe";
import type { recipeVersionSchema } from "../../contracts/food/recipe/recipe-version.contract";
import { db } from "../../db";
import { recipeIngredients, recipes } from "../../db/schemas";

export async function handleRecipeIngredientsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeIngredientsSchema>;
    }
) {
    const { payload } = event;

    // Insert recipe ingredients
    for (const ingredient of payload.ingredients) {
        await db.insert(recipeIngredients).values({
            id: ingredient.id,
            recipeId: payload.recipeId,
            ingredientText: ingredient.ingredientText,
            sortOrder: ingredient.sortOrder,
        });
    }
}

export async function handleRecipeIngredientsUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeIngredientsUpdateSchema>;
    }
) {
    const { payload } = event;

    // Delete existing ingredients
    await db
        .delete(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, payload.recipeId));

    // Insert updated ingredients
    for (const ingredient of payload.ingredients) {
        await db.insert(recipeIngredients).values({
            id: ingredient.id,
            recipeId: payload.recipeId,
            ingredientText: ingredient.ingredientText,
            sortOrder: ingredient.sortOrder,
        });
    }
}

export async function handleRecipeIngredientsArchived(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeIngredientsArchiveSchema>;
    }
) {
    const { payload } = event;

    // Delete recipe ingredients
    await db
        .delete(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, payload.recipeId));
}

export async function handleRecipeIngredientsVersionUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeVersionSchema>;
    }
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
