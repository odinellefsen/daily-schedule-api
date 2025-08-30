import crypto from "node:crypto";
import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    habitArchivedSchema,
    habitCreatedSchema,
    habitsCreatedSchema,
    habitUpdatedSchema,
} from "../../contracts/habit/habit.contract";
import { db } from "../../db";
import { habits } from "../../db/schemas";

export async function handleHabitCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof habitCreatedSchema>;
    },
) {
    const { payload } = event;

    await db.insert(habits).values({
        id: payload.id,
        userId: payload.userId,
        name: payload.name,
        description: payload.description,
        isActive: payload.isActive,
        instructionId: payload.instructionId,
        mealId: payload.mealId,
        mealName: payload.mealName,
        recurrenceType: payload.recurrenceType,
        recurrenceInterval: payload.recurrenceInterval,
        startDate: payload.startDate,
        timezone: payload.timezone,
        weekDays: payload.weekDays,
        preferredTime: payload.preferredTime,
    });
}

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
        name: `${payload.mealName}: ${habitData.instructionText}`,
        description: `Instruction for ${payload.mealName}`,
        isActive: true,
        instructionId: habitData.instructionId,
        mealId: payload.mealId,
        mealName: payload.mealName,
        recurrenceType: habitData.recurrenceType,
        recurrenceInterval: habitData.recurrenceInterval,
        startDate: habitData.startDate,
        timezone: habitData.timezone,
        weekDays: habitData.weekDays,
        preferredTime: habitData.preferredTime,
    }));

    // Insert all habits in a single transaction
    await db.insert(habits).values(habitRecords);
}

export async function handleHabitUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof habitUpdatedSchema>;
    },
) {
    const { payload } = event;

    await db
        .update(habits)
        .set({
            name: payload.name,
            description: payload.description,
            isActive: payload.isActive,
            instructionId: payload.instructionId,
            mealId: payload.mealId,
            mealName: payload.mealName,
            recurrenceType: payload.recurrenceType,
            recurrenceInterval: payload.recurrenceInterval,
            startDate: payload.startDate,
            timezone: payload.timezone,
            weekDays: payload.weekDays,
            preferredTime: payload.preferredTime,
        })
        .where(eq(habits.id, payload.id));
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
