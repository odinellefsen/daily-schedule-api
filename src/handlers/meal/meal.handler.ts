import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    mealArchiveSchema,
    mealSchema,
    mealUpdateSchema,
} from "../../contracts/food/meal";
import { db } from "../../db";
import { meals } from "../../db/schemas";

export async function handleMealCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealSchema>;
    }
) {
    const { payload } = event;

    await db.insert(meals).values({
        id: payload.id,
        userId: payload.userId,
        mealName: payload.mealName,
        scheduledToBeEatenAt: payload.scheduledToBeEatenAt
            ? new Date(payload.scheduledToBeEatenAt)
            : null,
        hasMealBeenConsumed: payload.hasMealBeenConsumed,
        recipes: JSON.stringify(payload.recipes),
    });
}

export async function handleMealUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealUpdateSchema>;
    }
) {
    const { payload } = event;

    await db
        .update(meals)
        .set({
            mealName: payload.mealName,
            scheduledToBeEatenAt: payload.scheduledToBeEatenAt
                ? new Date(payload.scheduledToBeEatenAt)
                : null,
            hasMealBeenConsumed: payload.hasMealBeenConsumed,
            recipes: JSON.stringify(payload.recipes),
        })
        .where(eq(meals.id, payload.id));
}

export async function handleMealArchived(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof mealArchiveSchema>;
    }
) {
    const { payload } = event;

    await db.delete(meals).where(eq(meals.id, payload.id));
}
