import crypto from "node:crypto";
import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    habitArchivedSchema,
    habitsCreatedSchema,
} from "../../contracts/habit/habit.contract";
import { db } from "../../db";
import { habits } from "../../db/schemas";

export async function handleHabitsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof habitsCreatedSchema>;
    },
) {
    const { payload } = event;

    // Create multiple habit records from the batch
    const habitRecords = payload.habits.map((habitData) => ({
        id: crypto.randomUUID(),
        userId: payload.userId,
        name: habitData.name,
        description: habitData.description,
        isActive: true,
        domain: payload.domain,
        entityId: payload.entityId,
        entityName: payload.entityName,
        subEntityId: habitData.subEntityId,
        subEntityName: habitData.subEntityName,
        recurrenceType: habitData.recurrenceType,
        recurrenceInterval: habitData.recurrenceInterval,
        startDate: habitData.startDate,
        timezone: habitData.timezone,
        weekDays: habitData.weekDays,
        monthlyDay: undefined, // Not supported in batch creation yet
        preferredTime: habitData.preferredTime,
    }));

    // Insert all habits in a single transaction
    await db.insert(habits).values(habitRecords);
}

export async function handleHabitArchived(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof habitArchivedSchema>;
    },
) {
    const { payload } = event;

    // For now, just mark as inactive - could implement soft delete later
    await db
        .update(habits)
        .set({ isActive: false })
        .where(eq(habits.id, payload.id));
}
