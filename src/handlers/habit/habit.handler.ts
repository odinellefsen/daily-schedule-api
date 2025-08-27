import type { FlowcoreEvent } from "@flowcore/pathways";
import type { z } from "zod";
import type { habitSchema } from "../../contracts/habit/habit.contract";
import { db } from "../../db";
import { habits } from "../../db/schemas";

export async function handleHabitCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof habitSchema>;
    },
) {
    const { payload } = event;

    await db.insert(habits).values({
        id: payload.id,
        userId: payload.userId,
        name: payload.title,
        description: payload.description,
        isActive: payload.isActive,
        recurrenceType: payload.recurrenceType,
        recurrenceInterval: payload.recurrenceInterval,
        weekDays: payload.weekDays,
        preferredTime: payload.whatTimeToStart,
        relationTemplate: payload.relationTemplate,
    });
}
