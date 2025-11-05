import type { FlowcoreEvent } from "@flowcore/pathways";
import type { z } from "zod";
import type { mealSchema } from "../../contracts/food/meal";
import { db } from "../../db";
import { meals } from "../../db/schemas";

export async function handleMealCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealSchema>;
    },
) {
    const { payload } = event;

    await db.insert(meals).values({
        id: payload.id,
        userId: payload.userId,
        mealName: payload.mealName,
    });
}
