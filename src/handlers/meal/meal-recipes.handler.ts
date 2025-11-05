import type { FlowcoreEvent } from "@flowcore/pathways";
import type { z } from "zod";
import type { mealRecipeAttachSchema } from "../../contracts/food/meal";
import { db } from "../../db";
import { mealRecipes } from "../../db/schemas";

export async function handleMealRecipeAttached(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealRecipeAttachSchema>;
    },
) {
    const { payload } = event;

    // Insert all recipes in a single transaction
    const values = payload.recipes.map((recipe) => ({
        id: crypto.randomUUID(),
        mealId: payload.mealId,
        recipeId: recipe.recipeId,
        orderInMeal: recipe.orderInMeal,
    }));

    await db.insert(mealRecipes).values(values);
}
