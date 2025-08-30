import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { TodoGeneratedType } from "../contracts/todo";
import { db } from "../db";
import type { Habit } from "../db/schemas";
import { habits, occurrences } from "../db/schemas";
import { FlowcorePathways } from "../utils/flowcore";

/**
 * Convert dueDate, preferredTime, and timezone into a scheduledFor timestamp
 */
function calculateScheduledFor(
    dueDate: string, // YYYY-MM-DD
    preferredTime: string | undefined, // HH:MM
    timezone: string | undefined, // IANA timezone
): Date {
    // Default time if not specified (9:00 AM)
    const timeToUse = preferredTime || "09:00";
    const timezoneToUse = timezone || "UTC";

    // Parse the time
    const [hours, minutes] = timeToUse.split(":").map(Number);

    // Create date in user's timezone
    const [year, month, day] = dueDate.split("-").map(Number);

    // Create a date object representing the local time in the user's timezone
    const localDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

    // Convert to UTC using timezone offset calculation
    const localString = localDateTime.toISOString().slice(0, 19); // Remove Z
    const timeInTargetTz = new Date(`${localString} UTC`);

    // Calculate the offset by comparing UTC time with timezone time
    const utcTime = timeInTargetTz.getTime();
    const timezoneTime = new Date(
        timeInTargetTz.toLocaleString("sv-SE", { timeZone: timezoneToUse }),
    ).getTime();
    const offset = utcTime - timezoneTime;

    return new Date(localDateTime.getTime() + offset);
}

/**
 * Add days to a date string
 */
function addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

function getWeekdayFromDate(dateStr: string): string {
    const date = new Date(dateStr);
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
 */
function shouldGenerateForDate(habit: Habit, targetDate: string): boolean {
    const targetDateObj = new Date(targetDate);
    const startDateObj = new Date(habit.startDate);

    // Don't generate for dates before the habit start date
    if (targetDateObj < startDateObj) {
        return false;
    }

    switch (habit.recurrenceType) {
        case "daily": {
            const daysDiff = Math.floor(
                (targetDateObj.getTime() - startDateObj.getTime()) /
                    (1000 * 60 * 60 * 24),
            );
            return daysDiff % habit.recurrenceInterval === 0;
        }

        case "weekly": {
            const weekday = getWeekdayFromDate(targetDate);
            if (!habit.weekDays?.includes(weekday)) {
                return false;
            }

            const weeksDiff = Math.floor(
                (targetDateObj.getTime() - startDateObj.getTime()) /
                    (1000 * 60 * 60 * 24 * 7),
            );
            return weeksDiff % habit.recurrenceInterval === 0;
        }

        default:
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
 * Generate a single todo for an instruction habit
 * MASSIVELY SIMPLIFIED: Direct habit → todo mapping (1:1)
 */
async function generateTodoForHabit(
    habit: Habit,
    targetDate: string,
): Promise<void> {
    // Create or get occurrence for this instruction
    const occurrence = await upsertOccurrence({
        userId: habit.userId,
        domain: habit.domain,
        entityId: habit.entityId,
        subEntityId: habit.subEntityId,
        targetDate,
        habitId: habit.id,
    });

    // Calculate the precise scheduling timestamp
    const scheduledFor = calculateScheduledFor(
        targetDate,
        habit.preferredTime || undefined,
        habit.timezone || undefined,
    );

    // Create the todo event - SIMPLE!
    const todoEvent: TodoGeneratedType = {
        userId: habit.userId,
        habitId: habit.id,
        occurrenceId: occurrence.id,
        title: habit.name,
        dueDate: targetDate,
        preferredTime: habit.preferredTime || undefined,
        scheduledFor: scheduledFor.toISOString(),
        timezone: habit.timezone || undefined,
        domain: habit.domain,
        entityId: habit.entityId,
        subEntityId: habit.subEntityId,
    };

    // Emit the event through Flowcore
    await FlowcorePathways.write("todo.v0/todo.generated.v0", {
        data: todoEvent,
    });
}

/**
 * Core habit generation service - SIMPLIFIED!
 * No more complex offset calculations, no more domain adapters!
 */
export async function generateMissingHabitTodos(
    userId: string,
    targetDate: string,
): Promise<void> {
    const dueHabits = await selectDueHabits(userId, targetDate);

    for (const habit of dueHabits) {
        try {
            await generateTodoForHabit(habit, targetDate);
        } catch (error) {
            console.error(
                `Failed to generate todo for habit ${habit.id}:`,
                error,
            );
            // Continue with other habits even if one fails
        }
    }
}
