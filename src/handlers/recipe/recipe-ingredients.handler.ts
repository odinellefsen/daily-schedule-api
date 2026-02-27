import type { FlowcoreEvent } from "@flowcore/pathways";
import type { z } from "zod";
import type { recipeIngredientsSchema } from "../../contracts/food/recipe";
import { db } from "../../db";
import { recipeIngredients } from "../../db/schemas";

export async function handleRecipeIngredientsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeIngredientsSchema>;
    },
) {
    const { payload } = event;

    // Insert recipe ingredients
    for (const ingredient of payload.ingredients) {
        await db.insert(recipeIngredients).values({
            id: ingredient.id,
            recipeId: payload.recipeId,
            ingredientText: ingredient.ingredientText,
        });
    }
}
