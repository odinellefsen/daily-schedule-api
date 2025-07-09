import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type z from "zod";
import type { foodRecipeEventContract } from "../contracts/recipe";
import { db } from "../db";
import { recipes } from "../db/schema";

export async function handlerRecipeCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof foodRecipeEventContract>;
    }
) {
    console.log("received an recipe created event ✅", event);

    await db.insert(recipes).values({
        id: event.payload.id,
        name: event.payload.nameOfTheFoodRecipe,
        description: event.payload.generalDescriptionOfTheFoodRecipe || null,
    });
}

export async function handlerRecipeUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof foodRecipeEventContract>;
    }
) {
    console.log("received an recipe updated event ✅", event);

    await db
        .update(recipes)
        .set({
            name: event.payload.nameOfTheFoodRecipe,
            description:
                event.payload.generalDescriptionOfTheFoodRecipe || null,
        })
        .where(eq(recipes.id, event.payload.id));
}

export async function handlerRecipeDeleted(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof foodRecipeEventContract>;
    }
) {
    console.log("received an recipe deleted event ✅", event);

    await db.delete(recipes).where(eq(recipes.id, event.payload.id));
}
