import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { TodoGeneratedType } from "../contracts/todo";
import { db } from "../db";
import type { Habit } from "../db/schemas";
import { habits, occurrences } from "../db/schemas";
import { FlowcorePathways } from "../utils/flowcore";
import { domainAdapters } from "./domain-adapters";

/**
 * Convert dueDate, preferredTime, and timezone into a scheduledFor timestamp
 */
function calculateScheduledFor(
    dueDate: string, // YYYY-MM-DD
    preferredTime: string | undefined, // HH:MM
    timezone: string | undefined, // IANA timezone
    stepIndex: number = 0, // For time distribution of multiple steps
    totalSteps: number = 1, // Total steps on this date
): Date {
    // Default time if not specified (9:00 AM)
    const timeToUse = preferredTime || "09:00";
    const timezoneToUse = timezone || "UTC";

    // Parse the time
    const [hours, minutes] = timeToUse.split(":").map(Number);

    // If multiple steps on same day, distribute them
    let adjustedHours = hours;
    let adjustedMinutes = minutes;

    if (totalSteps > 1) {
        // Spread steps over a 4-hour window, starting from preferred time
        const minutesToAdd = Math.floor(
            (stepIndex * 240) / Math.max(totalSteps - 1, 1),
        );
        adjustedMinutes += minutesToAdd;
        adjustedHours += Math.floor(adjustedMinutes / 60);
        adjustedMinutes %= 60;

        // Cap at reasonable hours (don't go past 10 PM)
        if (adjustedHours > 22) {
            adjustedHours = 22;
            adjustedMinutes = 0;
        }
    }

    // Create date in user's timezone
    const [year, month, day] = dueDate.split("-").map(Number);

    // Create a date object representing the local time in the user's timezone
    const localDateTime = new Date(
        year,
        month - 1,
        day,
        adjustedHours,
        adjustedMinutes,
        0,
        0,
    );

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
 * Selection strategy implementations
 */
function selectFromTemplate(
    relationTemplate: unknown,
    targetDate: string,
): { domain: string; entityId: string } {
    const template = relationTemplate as {
        strategy: { type: string; map?: Record<string, number> };
        items: Array<{ domain: string; entityId: string }>;
    };

    if (!template?.items?.length) {
        throw new Error("No items in relation template");
    }

    const { strategy, items } = template;

    switch (strategy.type) {
        case "fixed":
            return items[0];

        case "rotate": {
            // Use date as seed for consistent rotation
            const daysSinceEpoch = Math.floor(
                new Date(targetDate).getTime() / (1000 * 60 * 60 * 24),
            );
            const index = daysSinceEpoch % items.length;
            return items[index];
        }

        case "random": {
            // Use date as seed for consistent randomness per day
            const seed = targetDate;
            const hash = crypto.createHash("sha256").update(seed).digest("hex");
            const num = parseInt(hash.substring(0, 8), 16);
            const index = num % items.length;
            return items[index];
        }

        case "byWeekday": {
            const date = new Date(targetDate);
            const weekdayNames = [
                "sunday",
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
            ];
            const weekday = weekdayNames[date.getDay()];
            const index = strategy.map?.[weekday] ?? 0;
            return items[index] || items[0];
        }

        default:
            return items[0];
    }
}

/**
 * Date utilities
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
 * Find habits that should generate todos for the given date
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
 * Create or get existing occurrence
 */
async function upsertOccurrence(data: {
    userId: string;
    domain: string;
    entityId: string;
    version: number;
    targetDate: string;
    habitId: string;
}): Promise<{ id: string }> {
    // Try to find existing occurrence
    const existing = await db.query.occurrences.findFirst({
        where: and(
            eq(occurrences.userId, data.userId),
            eq(occurrences.domain, data.domain),
            eq(occurrences.entityId, data.entityId),
            eq(occurrences.version, data.version),
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
        version: data.version,
        targetDate: data.targetDate,
        habitId: data.habitId,
        status: "planned" as const,
    };

    await db.insert(occurrences).values(newOccurrence);
    return newOccurrence;
}

/**
 * Generate todos for a specific habit and date
 */
async function generateTodosForHabit(
    habit: Habit,
    targetDate: string,
): Promise<void> {
    // Select domain target using strategy
    const { domain, entityId } = selectFromTemplate(
        habit.relationTemplate ? JSON.parse(habit.relationTemplate) : null,
        targetDate,
    );

    // Get domain adapter
    const adapter = domainAdapters.get(domain);

    // Get latest version and create/upsert occurrence
    const version = await adapter.getLatestVersion(entityId);
    const occurrence = await upsertOccurrence({
        userId: habit.userId,
        domain,
        entityId,
        version,
        targetDate,
        habitId: habit.id,
    });

    // Resolve the plan (what steps to create)
    const planSteps = await adapter.resolvePlan(
        habit.relationTemplate
            ? JSON.parse(habit.relationTemplate).payload
            : null,
        entityId,
        version,
    );

    // If no specific steps, create one todo for the whole item
    const items =
        planSteps.length > 0
            ? planSteps
            : [
                  {
                      instructionKey: undefined,
                      offsetDays: 0,
                      titleOverride: undefined,
                  },
              ];

    // Group items by dueDate for intelligent time distribution
    const itemsByDate = new Map<
        string,
        Array<{
            instructionKey:
                | {
                      recipeId: string;
                      recipeVersion: number;
                      instructionId: string;
                  }
                | undefined;
            offsetDays: number;
            titleOverride?: string;
        }>
    >();

    for (const item of items) {
        const dueDate = addDays(targetDate, item.offsetDays);
        if (!itemsByDate.has(dueDate)) {
            itemsByDate.set(dueDate, []);
        }
        itemsByDate.get(dueDate)!.push(item);
    }

    // Generate todos for each step with intelligent scheduling
    for (const [dueDate, dateItems] of Array.from(itemsByDate.entries())) {
        const totalStepsOnDate = dateItems.length;

        for (let stepIndex = 0; stepIndex < dateItems.length; stepIndex++) {
            const item = dateItems[stepIndex];
            const instructionKey = item.instructionKey;

            // Get snapshot for replay safety (cached per entityId+version)
            const snapshot = await adapter.snapshot(entityId, version);

            // Determine title
            const title = item.titleOverride || habit.name;

            // Calculate the precise scheduling timestamp with intelligent distribution
            const scheduledFor = calculateScheduledFor(
                dueDate,
                habit.preferredTime || undefined,
                habit.timezone || undefined,
                stepIndex,
                totalStepsOnDate,
            );

            const todoEvent: TodoGeneratedType = {
                userId: habit.userId,
                habitId: habit.id,
                occurrenceId: occurrence.id,
                title,
                dueDate,
                preferredTime: habit.preferredTime || undefined,
                scheduledFor: scheduledFor.toISOString(),
                timezone: habit.timezone || undefined,
                relation: { domain, entityId, version },
                instructionKey,
                snapshot,
            };

            // Emit the event through Flowcore
            await FlowcorePathways.write("todo.v0/todo.generated.v0", {
                data: todoEvent,
            });
        }
    }
}

/**
 * Core habit generation service - main entry point
 */
export async function generateMissingHabitTodos(
    userId: string,
    targetDate: string,
): Promise<void> {
    const dueHabits = await selectDueHabits(userId, targetDate);

    for (const habit of dueHabits) {
        try {
            await generateTodosForHabit(habit, targetDate);
        } catch (error) {
            console.error(
                `Failed to generate todos for habit ${habit.id}:`,
                error,
            );
            // Continue with other habits even if one fails
        }
    }
}
