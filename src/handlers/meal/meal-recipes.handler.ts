import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    mealRecipeAttachSchema,
    mealRecipeDetachSchema,
} from "../../contracts/food/meal";
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
        recipeVersion: recipe.recipeVersion,
        orderInMeal: recipe.orderInMeal,
    }));

    await db.insert(mealRecipes).values(values);
}

export async function handleMealRecipeDetached(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealRecipeDetachSchema>;
    },
) {
    const { payload } = event;

    await db
        .delete(mealRecipes)
        .where(eq(mealRecipes.id, payload.mealRecipeId));
}
