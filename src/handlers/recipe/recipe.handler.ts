import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    recipeArchiveSchema,
    recipeSchema,
    recipeUpdateSchema,
} from "../../contracts/food/recipe";
import type { recipeVersionSchema } from "../../contracts/food/recipe/recipe-version.contract";
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

export async function handleRecipeUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeUpdateSchema>;
    },
) {
    const { payload } = event;

    await db
        .update(recipes)
        .set({
            nameOfTheRecipe: payload.nameOfTheRecipe,
            generalDescriptionOfTheRecipe:
                payload.generalDescriptionOfTheRecipe,
            whenIsItConsumed: payload.whenIsItConsumed,
        })
        .where(eq(recipes.id, payload.id));
}

export async function handleRecipeArchived(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeArchiveSchema>;
    },
) {
    const { payload } = event;

    await db.delete(recipes).where(eq(recipes.id, payload.id));
}

export async function handleRecipeVersionUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeVersionSchema>;
    },
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
