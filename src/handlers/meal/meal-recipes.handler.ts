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

    await db.insert(mealRecipes).values({
        id: crypto.randomUUID(),
        mealId: payload.mealId,
        recipeId: payload.recipeId,
        recipeVersion: payload.recipeVersion,
        orderInMeal: payload.orderInMeal,
        addedAt: new Date(),
    });
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
