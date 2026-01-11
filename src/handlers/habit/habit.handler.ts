import { randomUUID } from "node:crypto";
import type { FlowcoreEvent } from "@flowcore/pathways";
import type { z } from "@hono/zod-openapi";
import { habitsCreatedSchema } from "../../contracts/habit/habit.contract";
import { db } from "../../db";
import { habitSubEntities, habits, habitTriggers } from "../../db/schemas";

export async function handleHabitsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof habitsCreatedSchema>;
    },
) {
    const { payload } = event;
    const habitId = randomUUID();

    // 1. Create main habit record
    const habitRecord = {
        id: habitId,
        userId: payload.userId,
        domain: payload.domain,
        entityId: payload.entityId,
        recurrenceType: payload.recurrenceType,
        targetWeekday: payload.targetWeekday,
        targetTime: payload.targetTime || null,
        startDate: payload.startDate,
        isActive: true,
    };

    // 2. Calculate trigger (subEntity with biggest offset from target weekday)
    const triggerSubEntity = findTriggerSubEntityForWeekRecurrenceType(
        payload.targetWeekday,
        payload.subEntities,
    );

    // 3. Create habit trigger record
    const triggerRecord = {
        id: randomUUID(),
        habitId,
        triggerSubEntityId: triggerSubEntity.subEntityId || null,
        triggerWeekday: triggerSubEntity.scheduledWeekday ?? payload.targetWeekday,
    };

    // 4. Create all subEntity records
    const subEntityRecords = payload.subEntities.map((subEntity) => ({
        id: randomUUID(),
        habitId,
        subEntityId: subEntity.subEntityId || null,
        scheduledWeekday: subEntity.scheduledWeekday ?? payload.targetWeekday,
        scheduledTime: subEntity.scheduledTime || null,
    }));

    // 5. Insert all records in a transaction
    await db.transaction(async (tx) => {
        await tx.insert(habits).values(habitRecord);
        await tx.insert(habitTriggers).values(triggerRecord);
        await tx.insert(habitSubEntities).values(subEntityRecords);
    });
}

/**
 * Find the subEntity with the biggest offset (earliest in the week) to use as trigger
 */
function findTriggerSubEntityForWeekRecurrenceType(
    targetWeekday: string,
    subEntities: Array<{
        subEntityId?: string;
        scheduledWeekday?: string;
        scheduledTime?: string;
    }>,
) {
    const weekdays = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
    ];
    const targetDay = weekdays.indexOf(targetWeekday);

    let maxOffset = -1;
    let triggerSubEntity = subEntities[0]; // fallback

    for (const subEntity of subEntities) {
        if (!subEntity.scheduledWeekday) continue;
        const subEntityDay = weekdays.indexOf(subEntity.scheduledWeekday);

        // Calculate days before target (positive = earlier in week)
        let offset = targetDay - subEntityDay;
        if (offset < 0) offset += 7; // Handle week wraparound

        if (offset > maxOffset) {
            maxOffset = offset;
            triggerSubEntity = subEntity;
        }
    }

    return triggerSubEntity;
}
