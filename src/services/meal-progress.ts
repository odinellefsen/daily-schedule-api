import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { mealRecipes, recipeInstructions, todos } from "../db/schemas";

export interface MealProgressForDate {
    mealId: string;
    targetDate: string;
    instructions: Array<{
        id: string;
        instruction: string;
        instructionNumber: number;
        recipeId: string;
        isCompleted: boolean;
        completedAt: Date | null;
        todoId: string | null;
    }>;
    progress: {
        totalInstructions: number;
        completedInstructions: number;
        percentComplete: number;
        nextInstruction: string | null;
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
    // 1. Get all recipes attached to this meal
    const mealRecipesData = await db
        .select()
        .from(mealRecipes)
        .where(eq(mealRecipes.mealId, mealId))
        .orderBy(mealRecipes.orderInMeal);

    // 2. Fetch all instructions for all recipes in this meal
    const allInstructions = [];
    for (const mealRecipe of mealRecipesData) {
        const instructions = await db
            .select()
            .from(recipeInstructions)
            .where(eq(recipeInstructions.recipeId, mealRecipe.recipeId))
            .orderBy(recipeInstructions.instructionNumber);

        for (const inst of instructions) {
            allInstructions.push({
                ...inst,
                recipeId: mealRecipe.recipeId,
            });
        }
    }

    // 3. Find completed todos for this meal on this date
    const completedTodos = await db.query.todos.findMany({
        where: and(
            eq(todos.userId, userId),
            eq(todos.domain, "meal"),
            eq(todos.entityId, mealId),
            eq(todos.dueDate, targetDate),
            eq(todos.completed, true),
        ),
    });

    // 4. Map completed todos to instruction completions
    const completedInstructionIds = new Set(
        completedTodos.map((todo) => todo.subEntityId).filter(Boolean),
    );

    const todoByInstructionId = new Map(
        completedTodos.map((todo) => [todo.subEntityId, todo]),
    );

    // 5. Calculate progress for each instruction
    const instructionsWithProgress = allInstructions.map((inst) => {
        const isCompleted = completedInstructionIds.has(inst.id);
        const todo = todoByInstructionId.get(inst.id);

        return {
            id: inst.id,
            instruction: inst.instruction,
            instructionNumber: inst.instructionNumber,
            recipeId: inst.recipeId,
            isCompleted,
            completedAt: todo?.completedAt || null,
            todoId: todo?.id || null,
        };
    });

    // 6. Calculate overall progress
    const completedCount = instructionsWithProgress.filter(
        (inst) => inst.isCompleted,
    ).length;
    const nextInstruction = instructionsWithProgress.find(
        (inst) => !inst.isCompleted,
    );

    return {
        mealId,
        targetDate,
        instructions: instructionsWithProgress,
        progress: {
            totalInstructions: allInstructions.length,
            completedInstructions: completedCount,
            percentComplete:
                allInstructions.length > 0
                    ? Math.round(
                          (completedCount / allInstructions.length) * 100,
                      )
                    : 0,
            nextInstruction: nextInstruction?.instruction || null,
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
