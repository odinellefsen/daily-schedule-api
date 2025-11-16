import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    recipeArchiveSchema,
    recipeSchema,
} from "../../contracts/food/recipe";
import { db } from "../../db";
import { recipes } from "../../db/schemas";

export async function handleRecipeCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeSchema>;
    },
) {
    const { payload } = event;

    await db.insert(recipes).values({
        id: payload.id,
        userId: payload.userId,
        nameOfTheRecipe: payload.nameOfTheRecipe,
        generalDescriptionOfTheRecipe: payload.generalDescriptionOfTheRecipe,
        whenIsItConsumed: payload.whenIsItConsumed,
    });
}

export async function handleRecipeArchived(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeArchiveSchema>;
    },
) {
    const { payload } = event;

    console.log("123payload: ", payload);

    await db.delete(recipes).where(eq(recipes.id, payload.recipeId));
}
