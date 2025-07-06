import type { FlowcoreEvent } from "@flowcore/pathways";
import type z from "zod";
import type { foodRecipeEventContract } from "../contracts/recipe";
import { db } from "../db";
import { recipes } from "../db/schema";

export async function handlerRecipeCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof foodRecipeEventContract>;
    }
) {
    console.log("received an event ✅", event);

    await db.insert(recipes).values({
        id: event.payload.id,
        name: event.payload.nameOfTheFoodRecipe,
        description: event.payload.generalDescriptionOfTheFoodRecipe || null,
    });
}
