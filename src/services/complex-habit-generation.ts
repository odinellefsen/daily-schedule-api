import crypto from "node:crypto";
import { addMinutes, format } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { habitSubEntityOffsets, habits, occurrences } from "../db/schemas";
import { FlowcorePathways } from "../utils/flowcore";

/**
 * Determines when todos should be generated for a habit instance.
 * For complex habits, generation happens on the day of the EARLIEST todo.
 */
export async function shouldGenerateHabitInstance(
    habitId: string,
    targetDate: string,
): Promise<{ shouldGenerate: boolean; targetDateTime?: Date }> {
    const habit = await db.query.habits.findFirst({
        where: eq(habits.id, habitId),
    });

    if (!habit) {
        return { shouldGenerate: false };
    }

    // Check if this habit is due on the target date
    if (!isHabitDueOnDate(habit, targetDate)) {
        return { shouldGenerate: false };
    }

    // Calculate the target datetime for this occurrence
    const targetDateTime = calculateTargetDateTime(habit, targetDate);

    // For simple habits (no domain), generate on the due date
    if (!habit.domain || !habit.entityId) {
        return { shouldGenerate: true, targetDateTime };
    }

    // For complex habits, check if today is the earliest todo date
    const earliestTodoDate = await calculateEarliestTodoDate(
        habit,
        targetDateTime,
    );

    return {
        shouldGenerate: earliestTodoDate === targetDate,
        targetDateTime,
    };
}

/**
 * Calculates the earliest todo date for a complex habit instance.
 * This is the date when we should generate ALL todos for the instance.
 */
async function calculateEarliestTodoDate(
    habit: typeof habits.$inferSelect,
    targetDateTime: Date,
): Promise<string> {
    // Get all sub-entity offsets for this habit
    const offsets = await db.query.habitSubEntityOffsets.findMany({
        where: eq(habitSubEntityOffsets.habitId, habit.id),
    });

    if (offsets.length === 0) {
        // No offsets defined, all todos appear on target date
        return targetDateTime.toISOString().split("T")[0];
    }

    // Find the biggest offset (most negative = earliest)
    const biggestOffset = Math.min(...offsets.map((o) => o.offsetMinutes));

    // Calculate the earliest todo datetime
    const earliestDateTime = addMinutes(targetDateTime, biggestOffset);

    return earliestDateTime.toISOString().split("T")[0];
}

/**
 * Generates all todos for a habit instance.
 * For complex habits, this creates todos for all sub-entities with the same instanceId.
 */
export async function generateHabitInstanceTodos(
    habitId: string,
    targetDateTime: Date,
): Promise<{ instanceId: string; todosGenerated: number }> {
    const habit = await db.query.habits.findFirst({
        where: eq(habits.id, habitId),
    });

    if (!habit) {
        throw new Error(`Habit ${habitId} not found`);
    }

    const instanceId = crypto.randomUUID();

    // For simple habits (no domain)
    if (!habit.domain || !habit.entityId) {
        await generateSimpleHabitTodo(habit, targetDateTime, instanceId);
        return { instanceId, todosGenerated: 1 };
    }

    // For complex habits
    const offsets = await db.query.habitSubEntityOffsets.findMany({
        where: eq(habitSubEntityOffsets.habitId, habit.id),
    });

    // Create occurrence record for tracking
    await db.insert(occurrences).values({
        id: instanceId,
        userId: habit.userId,
        domain: habit.domain,
        entityId: habit.entityId,
        subEntityId: null, // This represents the entire instance
        habitId: habit.id,
        status: "planned",
    });

    // Generate todos for all sub-entities
    const todoPromises = offsets.map((offset) =>
        generateSubEntityTodo(habit, offset, targetDateTime, instanceId),
    );

    // Also generate the main "consume" todo (at target time)
    todoPromises.push(
        generateMainEntityTodo(habit, targetDateTime, instanceId),
    );

    await Promise.all(todoPromises);

    return {
        instanceId,
        todosGenerated: offsets.length + 1, // sub-entities + main todo
    };
}

async function generateSimpleHabitTodo(
    habit: typeof habits.$inferSelect,
    targetDateTime: Date,
    instanceId: string,
): Promise<void> {
    const todoEvent = {
        id: crypto.randomUUID(),
        userId: habit.userId,
        habitId: habit.id,
        occurrenceId: instanceId,
        title: habit.name,
        description: habit.description,
        dueDate: targetDateTime.toISOString().split("T")[0],
        scheduledFor: targetDateTime.toISOString(),
        preferredTime: habit.preferredTime || undefined,
        domain: undefined,
        entityId: undefined,
        subEntityId: undefined,
        completed: false,
        eventId: undefined,
    };

    await FlowcorePathways.write("todo.v0/todo.generated.v0", {
        data: todoEvent,
    });
}

async function generateSubEntityTodo(
    habit: typeof habits.$inferSelect,
    offset: typeof habitSubEntityOffsets.$inferSelect,
    targetDateTime: Date,
    instanceId: string,
): Promise<void> {
    const todoDateTime = addMinutes(targetDateTime, offset.offsetMinutes);

    const todoEvent = {
        id: crypto.randomUUID(),
        userId: habit.userId,
        habitId: habit.id,
        occurrenceId: instanceId,
        title: `${offset.subEntityName || "Step"} (for ${habit.entityName || habit.name})`,
        dueDate: todoDateTime.toISOString().split("T")[0],
        scheduledFor: todoDateTime.toISOString(),
        preferredTime: format(todoDateTime, "HH:mm"),
        domain: habit.domain || undefined,
        entityId: habit.entityId || undefined,
        subEntityId: offset.subEntityId,
        completed: false,
        eventId: undefined,
    };

    await FlowcorePathways.write("todo.v0/todo.generated.v0", {
        data: todoEvent,
    });
}

async function generateMainEntityTodo(
    habit: typeof habits.$inferSelect,
    targetDateTime: Date,
    instanceId: string,
): Promise<void> {
    // Main todo (e.g., "Consume meal") appears at the target time
    const todoEvent = {
        id: crypto.randomUUID(),
        userId: habit.userId,
        habitId: habit.id,
        occurrenceId: instanceId,
        title: `${habit.entityName || habit.name}`,
        description: `Complete ${habit.entityName || habit.name}`,
        dueDate: targetDateTime.toISOString().split("T")[0],
        scheduledFor: targetDateTime.toISOString(),
        preferredTime: habit.preferredTime || undefined,
        domain: habit.domain || undefined,
        entityId: habit.entityId || undefined,
        subEntityId: undefined, // Main entity has no sub-entity
        completed: false,
        eventId: undefined,
    };

    await FlowcorePathways.write("todo.v0/todo.generated.v0", {
        data: todoEvent,
    });
}

/**
 * Helper to check if a habit is due on a specific date
 */
function isHabitDueOnDate(
    _habit: typeof habits.$inferSelect,
    _targetDate: string,
): boolean {
    // Implementation would use the existing recurrence logic
    // from habit-generation.ts
    // This is a placeholder - would import and use shouldGenerateForDate
    return true; // Simplified for example
}

/**
 * Calculate the target datetime for a habit on a specific date
 */
function calculateTargetDateTime(
    habit: typeof habits.$inferSelect,
    targetDate: string,
): Date {
    const timeToUse = habit.preferredTime || "09:00";
    const timezoneToUse = habit.timezone || "UTC";

    const dateTimeString = `${targetDate} ${timeToUse}`;
    return zonedTimeToUtc(dateTimeString, timezoneToUse);
}
