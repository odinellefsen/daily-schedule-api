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
import { habits, occurrences, todos } from "../db/schemas";
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
 * Create or get existing occurrence for a domain instance (e.g., meal, workout)
 * This creates ONE occurrence per domain entity (no date constraint)
 */
async function upsertDomainOccurrence(data: {
    userId: string;
    domain: string;
    entityId: string;
    entityName?: string;
}): Promise<{ id: string }> {
    // Try to find existing occurrence for this domain instance
    // Check if any todos exist for this domain instance first
    const existingTodo = await db.query.todos.findFirst({
        where: and(
            eq(todos.userId, data.userId),
            eq(todos.domain, data.domain),
            eq(todos.entityId, data.entityId),
        ),
    });

    if (existingTodo?.occurrenceId) {
        // Return the existing occurrence
        return { id: existingTodo.occurrenceId };
    }

    // Create new domain occurrence
    const newOccurrence = {
        id: crypto.randomUUID(),
        userId: data.userId,
        domain: data.domain,
        entityId: data.entityId,
        subEntityId: null, // Domain occurrences don't have subEntity
        habitId: null, // Domain occurrences aren't linked to specific habits
        status: "planned" as const,
    };

    await db.insert(occurrences).values(newOccurrence);

    console.log(
        `Created domain occurrence for ${data.domain} ${data.entityId}`,
    );

    return newOccurrence;
}

/**
 * Create or get existing occurrence for a standalone habit
 * This maintains the original 1:1 habit-to-occurrence relationship for simple habits
 */
async function upsertStandaloneOccurrence(data: {
    userId: string;
    habitId: string;
    targetDate: string;
}): Promise<{ id: string }> {
    // Try to find existing occurrence for this habit on this date
    // Check if any todos exist for this habit on this date
    const existingTodo = await db.query.todos.findFirst({
        where: and(
            eq(todos.userId, data.userId),
            eq(todos.habitId, data.habitId),
            eq(todos.dueDate, data.targetDate),
        ),
    });

    if (existingTodo?.occurrenceId) {
        // Return the existing occurrence
        return { id: existingTodo.occurrenceId };
    }

    // Create new standalone occurrence
    const newOccurrence = {
        id: crypto.randomUUID(),
        userId: data.userId,
        domain: null, // Standalone habits have no domain
        entityId: null,
        subEntityId: null,
        habitId: data.habitId,
        status: "planned" as const,
    };

    await db.insert(occurrences).values(newOccurrence);
    return newOccurrence;
}

/**
 * Generate todos for a group of domain habits (e.g., all meal instruction habits)
 * Creates ONE occurrence per domain instance, with all todos linking to it
 */
async function generateTodosForDomainGroup(
    domainHabits: Habit[],
    targetDate: string,
): Promise<void> {
    if (domainHabits.length === 0) return;

    const firstHabit = domainHabits[0];

    // Validate all habits belong to same domain instance
    const domain = firstHabit.domain!;
    const entityId = firstHabit.entityId!;
    const userId = firstHabit.userId;

    for (const habit of domainHabits) {
        if (
            habit.domain !== domain ||
            habit.entityId !== entityId ||
            habit.userId !== userId
        ) {
            throw new Error(
                `Mismatched domain group: expected ${domain}/${entityId} but got ${habit.domain}/${habit.entityId}`,
            );
        }
    }

    // Create ONE occurrence for the entire domain instance (e.g., "Breakfast")
    const occurrence = await upsertDomainOccurrence({
        userId,
        domain,
        entityId,
        entityName: firstHabit.entityName ?? undefined,
    });

    // Generate todos for all habits, linking them to the same occurrence
    const todoPromises = domainHabits.map(async (habit) => {
        // Calculate scheduling timestamp for this specific habit
        const scheduledFor = calculateScheduledFor(
            targetDate,
            habit.preferredTime || undefined,
            habit.timezone || undefined,
        );

        // Create todo event
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
    });

    // Wait for all todos to be generated
    await Promise.all(todoPromises);

    console.log(
        `Successfully generated ${domainHabits.length} todos for ${domain} ${entityId} on ${targetDate}`,
    );
}

/**
 * Generate todo for a standalone habit (no domain)
 * Creates one occurrence per habit (traditional approach)
 */
async function generateTodoForStandaloneHabit(
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

        // Create occurrence for this standalone habit
        const occurrence = await upsertStandaloneOccurrence({
            userId: habit.userId,
            habitId: habit.id,
            targetDate,
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

        // Group habits by domain instance for proper occurrence creation
        const domainGroups = new Map<string, Habit[]>();
        const standaloneHabits: Habit[] = [];

        for (const habit of dueHabits) {
            if (habit.domain && habit.entityId) {
                // Group domain habits by domain + entityId (e.g., "meal-123", "workout-456")
                const groupKey = `${habit.domain}-${habit.entityId}`;
                if (!domainGroups.has(groupKey)) {
                    domainGroups.set(groupKey, []);
                }
                domainGroups.get(groupKey)!.push(habit);
            } else {
                // Standalone habits (no domain)
                standaloneHabits.push(habit);
            }
        }

        // Process domain groups - one occurrence per domain instance
        for (const [groupKey, groupHabits] of Array.from(
            domainGroups.entries(),
        )) {
            try {
                await generateTodosForDomainGroup(groupHabits, targetDate);
                results.success += groupHabits.length;
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.error(
                    `Failed to generate todos for domain group ${groupKey}:`,
                    error,
                );

                results.failed += groupHabits.length;
                for (const habit of groupHabits) {
                    results.errors.push({
                        habitId: habit.id,
                        error: errorMessage,
                    });
                }
            }
        }

        // Process standalone habits in parallel batches
        const BATCH_SIZE = 5; // Process up to 5 habits simultaneously

        for (let i = 0; i < standaloneHabits.length; i += BATCH_SIZE) {
            const batch = standaloneHabits.slice(i, i + BATCH_SIZE);

            // Process batch in parallel
            const batchPromises = batch.map(async (habit) => {
                try {
                    await generateTodoForStandaloneHabit(habit, targetDate);
                    return { success: true, habitId: habit.id };
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    console.error(
                        `Failed to generate todo for habit ${habit.id}:`,
                        error,
                    );

                    return {
                        success: false,
                        habitId: habit.id,
                        error: errorMessage,
                    };
                }
            });

            // Wait for batch to complete
            const batchResults = await Promise.all(batchPromises);

            // Update results
            for (const result of batchResults) {
                if (result.success) {
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push({
                        habitId: result.habitId,
                        error: result.error!,
                    });
                }
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
