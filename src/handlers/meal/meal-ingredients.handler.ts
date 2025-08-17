import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    mealIngredientsArchiveSchema,
    mealIngredientsSchema,
    mealIngredientsUpdateSchema,
} from "../../contracts/food/meal";
import { db } from "../../db";
import { mealIngredients } from "../../db/schemas";

export async function handleMealIngredientsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealIngredientsSchema>;
    },
) {
    const { payload } = event;

    // Insert meal ingredients
    for (const ingredient of payload.ingredients) {
        await db.insert(mealIngredients).values({
            id: ingredient.id,
            mealId: payload.mealId,
            recipeId: ingredient.recipeId,
            ingredientText: ingredient.ingredientText,
        });
    }
}

export async function handleMealIngredientsUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealIngredientsUpdateSchema>;
    },
) {
    const { payload } = event;

    // Delete existing ingredients
    await db
        .delete(mealIngredients)
        .where(eq(mealIngredients.mealId, payload.mealId));

    // Insert updated ingredients
    for (const ingredient of payload.ingredients) {
        await db.insert(mealIngredients).values({
            id: ingredient.id,
            mealId: payload.mealId,
            recipeId: ingredient.recipeId,
            ingredientText: ingredient.ingredientText,
        });
    }
}

export async function handleMealIngredientsArchived(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealIngredientsArchiveSchema>;
    },
) {
    const { payload } = event;

    // Delete meal ingredients
    await db
        .delete(mealIngredients)
        .where(eq(mealIngredients.mealId, payload.mealId));
}
