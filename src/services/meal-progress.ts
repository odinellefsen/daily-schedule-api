import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { mealInstructions, occurrences, todos } from "../db/schemas";

export interface MealProgressForDate {
    mealId: string;
    targetDate: string;
    occurrence: {
        id: string;
        status: string;
        createdAt: Date;
    } | null;
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
 * Calculate meal progress for a specific date using occurrence-based completion tracking
 * This replaces the old meal_steps.isStepCompleted approach with dynamic calculation
 */
export async function getMealProgressForDate(
    mealId: string,
    userId: string,
    targetDate: string,
): Promise<MealProgressForDate> {
    // 1. Find occurrence for this meal by checking if any todos exist
    let occurrence = null;

    // First, try to find any todo for this meal to get the occurrence
    const mealTodo = await db.query.todos.findFirst({
        where: and(
            eq(todos.userId, userId),
            eq(todos.domain, "meal"),
            eq(todos.entityId, mealId),
        ),
    });

    if (mealTodo?.occurrenceId) {
        // Get the actual occurrence
        occurrence = await db.query.occurrences.findFirst({
            where: eq(occurrences.id, mealTodo.occurrenceId),
        });
    }

    // 2. Get all meal instructions
    const instructions = await db.query.mealInstructions.findMany({
        where: eq(mealInstructions.mealId, mealId),
        orderBy: mealInstructions.instructionNumber,
    });

    // 3. If no occurrence exists, no progress has been made
    if (!occurrence) {
        return {
            mealId,
            targetDate,
            occurrence: null,
            instructions: instructions.map((inst) => ({
                id: inst.id,
                instruction: inst.instruction,
                instructionNumber: inst.instructionNumber,
                estimatedDurationMinutes: inst.estimatedDurationMinutes,
                isCompleted: false,
                completedAt: null,
                todoId: null,
            })),
            progress: {
                totalInstructions: instructions.length,
                completedInstructions: 0,
                percentComplete: 0,
                nextInstruction: instructions[0]?.instruction || null,
                estimatedTimeRemaining: instructions.reduce(
                    (sum, inst) => sum + (inst.estimatedDurationMinutes || 0),
                    0,
                ),
            },
        };
    }

    // 4. Find completed todos for this occurrence
    const completedTodos = await db.query.todos.findMany({
        where: and(
            eq(todos.occurrenceId, occurrence.id),
            eq(todos.completed, true),
        ),
    });

    // 5. Map completed todos to instruction completions
    const completedInstructionIds = new Set(
        completedTodos.map((todo) => todo.subEntityId).filter(Boolean),
    );

    const todoByInstructionId = new Map(
        completedTodos.map((todo) => [todo.subEntityId, todo]),
    );

    // 6. Calculate progress for each instruction
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

    // 7. Calculate overall progress
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
        occurrence: {
            id: occurrence.id,
            status: occurrence.status,
            createdAt: occurrence.createdAt,
        },
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
 * Get occurrence-based progress for multiple meals on a date
 */
export async function getMealsProgressForDate(
    userId: string,
    targetDate: string,
): Promise<MealProgressForDate[]> {
    // Find all todos for meals on this date to discover meal occurrences
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
