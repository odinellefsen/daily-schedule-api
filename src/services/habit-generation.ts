import crypto from "node:crypto";
import {
    differenceInCalendarDays,
    differenceInCalendarWeeks,
    parseISO,
} from "date-fns";
import { utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import type { TodoGeneratedType } from "../contracts/todo";
import { db } from "../db";
import type { Habit } from "../db/schemas";
import { habits, occurrences } from "../db/schemas";
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
 * Get all habits that should generate todos for the given date
 */
async function selectDueHabits(
    userId: string,
    targetDate: string,
): Promise<Habit[]> {
    const allActiveHabits = await db.query.habits.findMany({
        where: and(eq(habits.userId, userId), eq(habits.isActive, true)),
    });

    return allActiveHabits.filter((habit) =>
        shouldGenerateForDate(habit, targetDate),
    );
}

/**
 * Check if a habit should generate todos for the given date
 * Uses timezone-aware date calculations and proper calendar date handling
 */
function shouldGenerateForDate(habit: Habit, targetDate: string): boolean {
    const timezone = habit.timezone || "UTC";

    try {
        // Parse dates in user's timezone context (noon to avoid DST edge cases)
        const targetDateInTz = zonedTimeToUtc(`${targetDate} 12:00`, timezone);
        const startDateInTz = zonedTimeToUtc(
            `${habit.startDate} 12:00`,
            timezone,
        );

        // Don't generate for dates before the habit start date
        if (targetDateInTz < startDateInTz) {
            return false;
        }

        switch (habit.recurrenceType) {
            case "daily": {
                // Use calendar days difference, not time-based difference
                const daysDiff = differenceInCalendarDays(
                    targetDateInTz,
                    startDateInTz,
                );
                return (
                    daysDiff >= 0 && daysDiff % habit.recurrenceInterval === 0
                );
            }

            case "weekly": {
                // First check if this weekday is included
                const weekday = getWeekdayFromDate(targetDate, timezone);
                if (!habit.weekDays?.includes(weekday)) {
                    return false;
                }

                // Then check if it's the right week based on interval
                const weeksDiff = differenceInCalendarWeeks(
                    targetDateInTz,
                    startDateInTz,
                );
                return (
                    weeksDiff >= 0 && weeksDiff % habit.recurrenceInterval === 0
                );
            }

            default:
                console.warn(
                    `Unknown recurrence type: ${habit.recurrenceType}`,
                );
                return false;
        }
    } catch (error) {
        console.error(
            `Error checking recurrence for habit ${habit.id}: ${error}`,
        );
        return false;
    }
}

/**
 * Create or get existing occurrence for an instruction habit
 */
async function upsertOccurrence(data: {
    userId: string;
    domain?: string;
    entityId?: string;
    subEntityId?: string;
    targetDate: string;
    habitId: string;
}): Promise<{ id: string }> {
    // Try to find existing occurrence
    const existing = await db.query.occurrences.findFirst({
        where: and(
            eq(occurrences.userId, data.userId),
            eq(occurrences.habitId, data.habitId),
            eq(occurrences.targetDate, data.targetDate),
        ),
    });

    if (existing) {
        return existing;
    }

    // Create new occurrence
    const newOccurrence = {
        id: crypto.randomUUID(),
        userId: data.userId,
        domain: data.domain,
        entityId: data.entityId,
        subEntityId: data.subEntityId,
        targetDate: data.targetDate,
        habitId: data.habitId,
        status: "planned" as const,
    };

    await db.insert(occurrences).values(newOccurrence);
    return newOccurrence;
}

/**
 * Generate a single todo for a habit
 * Enhanced with proper error handling and validation
 */
async function generateTodoForHabit(
    habit: Habit,
    targetDate: string,
): Promise<void> {
    try {
        // Validate habit has required fields
        if (!habit.id || !habit.userId || !habit.name) {
            throw new Error(
                `Invalid habit data: missing required fields for habit ${habit.id}`,
            );
        }

        // Validate targetDate format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
            throw new Error(
                `Invalid targetDate format: ${targetDate}. Expected YYYY-MM-DD`,
            );
        }

        // Create or get occurrence for this habit
        const occurrence = await upsertOccurrence({
            userId: habit.userId,
            domain: habit.domain ?? undefined,
            entityId: habit.entityId ?? undefined,
            subEntityId: habit.subEntityId ?? undefined,
            targetDate,
            habitId: habit.id,
        });

        // Calculate the precise scheduling timestamp
        const scheduledFor = calculateScheduledFor(
            targetDate,
            habit.preferredTime || undefined,
            habit.timezone || undefined,
        );

        // Create the todo event with proper validation
        const todoEvent: TodoGeneratedType = {
            userId: habit.userId,
            habitId: habit.id,
            occurrenceId: occurrence.id,
            title: habit.name,
            dueDate: targetDate,
            preferredTime: habit.preferredTime || undefined,
            scheduledFor: scheduledFor.toISOString(),
            timezone: habit.timezone || undefined,
            domain: habit.domain ?? undefined,
            entityId: habit.entityId ?? undefined,
            subEntityId: habit.subEntityId ?? undefined,
        };

        // Emit the event through Flowcore
        await FlowcorePathways.write("todo.v0/todo.generated.v0", {
            data: todoEvent,
        });

        console.log(
            `Successfully generated todo for habit ${habit.id} on ${targetDate}`,
        );
    } catch (error) {
        console.error(
            `Failed to generate todo for habit ${habit.id} on ${targetDate}:`,
            error,
        );
        throw error; // Re-throw to allow caller to handle
    }
}

/**
 * Core habit generation service with enhanced error handling and logging
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
            `Starting habit todo generation for user ${userId} on ${targetDate}`,
        );

        const dueHabits = await selectDueHabits(userId, targetDate);
        console.log(`Found ${dueHabits.length} habits due for ${targetDate}`);

        const results = {
            success: 0,
            failed: 0,
            errors: [] as Array<{ habitId: string; error: string }>,
        };

        // Process each habit
        for (const habit of dueHabits) {
            try {
                await generateTodoForHabit(habit, targetDate);
                results.success++;
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.error(
                    `Failed to generate todo for habit ${habit.id}:`,
                    error,
                );

                results.failed++;
                results.errors.push({
                    habitId: habit.id,
                    error: errorMessage,
                });

                // Continue with other habits even if one fails
            }
        }

        console.log(
            `Habit todo generation completed: ${results.success} successful, ${results.failed} failed`,
        );
        return results;
    } catch (error) {
        console.error(`Critical error in generateMissingHabitTodos:`, error);
        throw error;
    }
}
