import crypto from "node:crypto";
import { parseISO } from "date-fns";
import { utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import type { TodoGeneratedType } from "../contracts/todo";
import { db } from "../db";
import type { Habit } from "../db/schemas";
import { habitSubEntities, habits, habitTriggers } from "../db/schemas";
import { FlowcorePathways } from "../utils/flowcore";

/**
 * Convert dueDate, preferredTime, and timezone into a scheduledFor timestamp
 * Uses proper timezone handling with date-fns-tz
 */
function calculateScheduledFor(
    dueDate: string, // YYYY-MM-DD
    preferredTime: string | undefined, // HH:MM
    timezone: string | undefined, // IANA timezone
): Date {
    // Default time if not specified (9:00 AM)
    const timeToUse = preferredTime || "09:00";
    const timezoneToUse = timezone || "UTC";

    try {
        // Combine date and time in user's timezone
        const dateTimeString = `${dueDate} ${timeToUse}`;

        // Convert to UTC using proper timezone handling
        return zonedTimeToUtc(dateTimeString, timezoneToUse);
    } catch (error) {
        console.error(`Error calculating scheduledFor: ${error}`);
        // Fallback to UTC if timezone conversion fails
        const utcDate = parseISO(`${dueDate}T${timeToUse}:00.000Z`);
        return utcDate;
    }
}

/**
 * Get weekday from date string, timezone-aware
 */
function getWeekdayFromDate(dateStr: string, timezone?: string): string {
    const timezoneToUse = timezone || "UTC";

    try {
        // Parse date in the specified timezone
        const zonedDate = utcToZonedTime(
            parseISO(`${dateStr}T12:00:00.000Z`),
            timezoneToUse,
        );
        const weekdays = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
        ];
        return weekdays[zonedDate.getDay()];
    } catch (error) {
        console.error(
            `Error getting weekday for ${dateStr} in ${timezoneToUse}: ${error}`,
        );
        // Fallback to UTC
        const date = parseISO(`${dateStr}T12:00:00.000Z`);
        const weekdays = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
        ];
        return weekdays[date.getDay()];
    }
}

/**
 * Get all habit triggers that should fire for the given date
 */
async function selectTriggersForDate(
    userId: string,
    targetDate: string,
): Promise<
    Array<{
        trigger: {
            id: string;
            habitId: string;
            triggerSubEntityId: string | null;
            triggerWeekday: string;
        };
        habit: Habit;
        subEntities: Array<{
            id: string;
            habitId: string;
            subEntityId: string | null;
            subEntityName: string;
            scheduledWeekday: string;
            scheduledTime: string | null;
            isMainEvent: boolean;
        }>;
    }>
> {
    const weekday = getWeekdayFromDate(targetDate);

    // Find all triggers that should fire today for weekly habits
    const triggers = await db.query.habitTriggers.findMany({
        where: eq(habitTriggers.triggerWeekday, weekday),
    });

    // Get habits and subEntities for each trigger
    const triggersWithSubEntities = [];
    for (const trigger of triggers) {
        // Get the habit for this trigger
        const habit = await db.query.habits.findFirst({
            where: and(
                eq(habits.id, trigger.habitId),
                eq(habits.userId, userId),
                eq(habits.isActive, true),
                eq(habits.recurrenceType, "weekly"),
            ),
        });

        if (!habit) continue; // Skip if habit doesn't match user/active criteria

        const subEntities = await db.query.habitSubEntities.findMany({
            where: eq(habitSubEntities.habitId, habit.id),
            orderBy: habitSubEntities.scheduledWeekday,
        });

        triggersWithSubEntities.push({
            trigger,
            habit,
            subEntities,
        });
    }

    return triggersWithSubEntities;
}

/**
 * Generate todos for a habit instance (all subEntities for one habit)
 */
async function generateHabitInstance(
    habit: Habit,
    subEntities: Array<{
        id: string;
        habitId: string;
        subEntityId: string | null;
        subEntityName: string;
        scheduledWeekday: string;
        scheduledTime: string | null;
        isMainEvent: boolean;
    }>,
    triggerDate: string,
): Promise<void> {
    const instanceId = crypto.randomUUID();
    const todoEvents: TodoGeneratedType[] = [];

    // Generate todos for all subEntities in this habit instance
    for (const subEntity of subEntities) {
        // Calculate the actual scheduled date for this subEntity
        const scheduledDate = calculateScheduledDateForSubEntity(
            triggerDate,
            habit.targetWeekday,
            subEntity.scheduledWeekday,
            habit.timezone || undefined,
        );

        const scheduledTime = subEntity.scheduledTime || "09:00";
        const scheduledFor = calculateScheduledFor(
            scheduledDate,
            scheduledTime,
            habit.timezone || undefined,
        );

        // Create todo event
        const todoEvent: TodoGeneratedType = {
            userId: habit.userId,
            habitId: habit.id,
            instanceId,
            title: subEntity.isMainEvent
                ? `Complete ${habit.entityName}`
                : `${subEntity.subEntityName} for ${habit.entityName}`,
            dueDate: scheduledDate,
            preferredTime: scheduledTime,
            scheduledFor: scheduledFor.toISOString(),
            timezone: habit.timezone || undefined,
            domain: habit.domain,
            entityId: habit.entityId,
            subEntityId: subEntity.subEntityId || undefined,
        };

        todoEvents.push(todoEvent);
    }

    // Batch write all todos for this instance
    await FlowcorePathways.write("todo.v0/todo.generated.v0", {
        batch: true,
        data: todoEvents,
    });

    console.log(
        `Successfully generated ${todoEvents.length} todos for habit instance ${habit.entityName}`,
    );
}

/**
 * Calculate the actual scheduled date for a subEntity based on trigger date
 */
function calculateScheduledDateForSubEntity(
    triggerDate: string,
    _targetWeekday: string,
    subEntityWeekday: string,
    timezone?: string,
): string {
    const weekdays = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
    ];
    const subEntityDay = weekdays.indexOf(subEntityWeekday);
    const triggerDay = getWeekdayFromDate(triggerDate, timezone);
    const triggerDayIndex = weekdays.indexOf(triggerDay);

    // Calculate offset from trigger to subEntity
    let offset = subEntityDay - triggerDayIndex;
    if (offset < 0) offset += 7; // Handle week wraparound

    // Add offset days to trigger date
    const triggerDateObj = parseISO(`${triggerDate}T12:00:00.000Z`);
    const scheduledDateObj = new Date(triggerDateObj);
    scheduledDateObj.setDate(scheduledDateObj.getDate() + offset);

    return scheduledDateObj.toISOString().split("T")[0]; // Return YYYY-MM-DD
}

/**
 * Core habit generation service for weekly habits with trigger-based generation
 */
export async function generateMissingHabitTodos(
    userId: string,
    targetDate: string,
): Promise<{
    success: number;
    failed: number;
    errors: Array<{ habitId: string; error: string }>;
}> {
    try {
        // Validate inputs
        if (!userId) {
            throw new Error("userId is required");
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
            throw new Error(
                `Invalid targetDate format: ${targetDate}. Expected YYYY-MM-DD`,
            );
        }

        console.log(
            `Starting weekly habit todo generation for user ${userId} on ${targetDate}`,
        );

        // Find all triggers that should fire today
        const triggersToFire = await selectTriggersForDate(userId, targetDate);
        console.log(
            `Found ${triggersToFire.length} habit triggers for ${targetDate}`,
        );

        const results = {
            success: 0,
            failed: 0,
            errors: [] as Array<{ habitId: string; error: string }>,
        };

        // Process each trigger to generate habit instances
        for (const { habit, subEntities } of triggersToFire) {
            try {
                await generateHabitInstance(habit, subEntities, targetDate);
                results.success++;
                console.log(`Generated habit instance for ${habit.entityName}`);
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.error(
                    `Failed to generate habit instance for ${habit.entityName}:`,
                    error,
                );

                results.failed++;
                results.errors.push({
                    habitId: habit.id,
                    error: errorMessage,
                });
            }
        }

        console.log(
            `Weekly habit generation completed: ${results.success} successful, ${results.failed} failed`,
        );
        return results;
    } catch (error) {
        console.error(`Critical error in generateMissingHabitTodos:`, error);
        throw error;
    }
}
