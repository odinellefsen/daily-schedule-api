import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { mealInstructions, todos } from "../db/schemas";

export interface MealProgressForDate {
    mealId: string;
    targetDate: string;
    instructions: Array<{
        id: string;
        instruction: string;
        instructionNumber: number;
        estimatedDurationMinutes: number | null;
        isCompleted: boolean;
        completedAt: Date | null;
        todoId: string | null;
    }>;
    progress: {
        totalInstructions: number;
        completedInstructions: number;
        percentComplete: number;
        nextInstruction: string | null;
        estimatedTimeRemaining: number;
    };
}

/**
 * Calculate meal progress for a specific date using direct todo completion tracking
 */
export async function getMealProgressForDate(
    mealId: string,
    userId: string,
    targetDate: string,
): Promise<MealProgressForDate> {
    // 1. Get all meal instructions
    const instructions = await db.query.mealInstructions.findMany({
        where: eq(mealInstructions.mealId, mealId),
        orderBy: mealInstructions.instructionNumber,
    });

    // 2. Find completed todos for this meal on this date
    const completedTodos = await db.query.todos.findMany({
        where: and(
            eq(todos.userId, userId),
            eq(todos.domain, "meal"),
            eq(todos.entityId, mealId),
            eq(todos.dueDate, targetDate),
            eq(todos.completed, true),
        ),
    });

    // 3. Map completed todos to instruction completions
    const completedInstructionIds = new Set(
        completedTodos.map((todo) => todo.subEntityId).filter(Boolean),
    );

    const todoByInstructionId = new Map(
        completedTodos.map((todo) => [todo.subEntityId, todo]),
    );

    // 4. Calculate progress for each instruction
    const instructionsWithProgress = instructions.map((inst) => {
        const isCompleted = completedInstructionIds.has(inst.id);
        const todo = todoByInstructionId.get(inst.id);

        return {
            id: inst.id,
            instruction: inst.instruction,
            instructionNumber: inst.instructionNumber,
            estimatedDurationMinutes: inst.estimatedDurationMinutes,
            isCompleted,
            completedAt: todo?.completedAt || null,
            todoId: todo?.id || null,
        };
    });

    // 5. Calculate overall progress
    const completedCount = instructionsWithProgress.filter(
        (inst) => inst.isCompleted,
    ).length;
    const nextInstruction = instructionsWithProgress.find(
        (inst) => !inst.isCompleted,
    );
    const estimatedTimeRemaining = instructionsWithProgress
        .filter((inst) => !inst.isCompleted && inst.estimatedDurationMinutes)
        .reduce((sum, inst) => sum + (inst.estimatedDurationMinutes || 0), 0);

    return {
        mealId,
        targetDate,
        instructions: instructionsWithProgress,
        progress: {
            totalInstructions: instructions.length,
            completedInstructions: completedCount,
            percentComplete:
                instructions.length > 0
                    ? Math.round((completedCount / instructions.length) * 100)
                    : 0,
            nextInstruction: nextInstruction?.instruction || null,
            estimatedTimeRemaining,
        },
    };
}

/**
 * Get progress for multiple meals on a date
 */
export async function getMealsProgressForDate(
    userId: string,
    targetDate: string,
): Promise<MealProgressForDate[]> {
    // Find all todos for meals on this date to discover meals
    const mealTodosForDate = await db.query.todos.findMany({
        where: and(
            eq(todos.userId, userId),
            eq(todos.domain, "meal"),
            eq(todos.dueDate, targetDate),
        ),
    });

    // Get unique meal entity IDs
    const uniqueMealIds = Array.from(
        new Set(mealTodosForDate.map((todo) => todo.entityId).filter(Boolean)),
    );

    // Get progress for each meal
    const progressPromises = uniqueMealIds.map((mealId) =>
        getMealProgressForDate(mealId!, userId, targetDate),
    );

    return Promise.all(progressPromises);
}

/**
 * Check if a meal is completely finished for a specific date
 */
export async function isMealCompleteForDate(
    mealId: string,
    userId: string,
    targetDate: string,
): Promise<boolean> {
    const progress = await getMealProgressForDate(mealId, userId, targetDate);
    return progress.progress.percentComplete === 100;
}
