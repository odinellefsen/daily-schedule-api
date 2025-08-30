import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { TodoGeneratedType } from "../contracts/todo";
import { db } from "../db";
import type { Habit } from "../db/schemas";
import { habits, occurrences } from "../db/schemas";
import { FlowcorePathways } from "../utils/flowcore";
import { domainAdapters } from "./domain-adapters";

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
 * Idempotency key generation
 */
function makeIdempotencyKey(
    userId: string,
    habitId: string,
    dueDate: string,
    instructionKey?: unknown,
): string {
    const base = `${userId}:${habitId}:${dueDate}`;
    const keyPart = instructionKey
        ? `:${crypto.createHash("sha256").update(JSON.stringify(instructionKey)).digest("hex").substring(0, 16)}`
        : "";
    return crypto
        .createHash("sha256")
        .update(base + keyPart)
        .digest("hex");
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

    // Generate todos for each step
    for (const item of items) {
        const dueDate = addDays(targetDate, item.offsetDays);
        const instructionKey = item.instructionKey;

        const idempotencyKey = makeIdempotencyKey(
            habit.userId,
            habit.id,
            dueDate,
            instructionKey,
        );

        // Get snapshot for replay safety
        const snapshot = await adapter.snapshot(entityId, version);

        // Determine title
        const title = item.titleOverride || habit.name;

        const todoEvent: TodoGeneratedType = {
            idempotencyKey,
            userId: habit.userId,
            habitId: habit.id,
            occurrenceId: occurrence.id,
            title,
            dueDate,
            preferredTime: habit.preferredTime || undefined,
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
