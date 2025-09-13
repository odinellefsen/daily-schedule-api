import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import {
    mealInstructions,
    meals,
    occurrences,
    todos,
} from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

export interface MealOccurrenceDetails {
    occurrence: {
        id: string;
        userId: string;
        domain: string;
        entityId: string;
        targetDate: string;
        status: string;
        createdAt: Date;
    };
    meal: {
        id: string;
        mealName: string;
        scheduledToBeEatenAt: Date | null;
        recipes: Array<{
            recipeId: string;
            recipeName: string;
            recipeDescription: string;
            recipeVersion: number;
        }>;
    };
    instructions: Array<{
        id: string;
        instruction: string;
        instructionNumber: number;
        estimatedDurationMinutes: number | null;
        todo: {
            id: string;
            title: string;
            completed: boolean;
            completedAt: Date | null;
            scheduledFor: Date | null;
        } | null;
    }>;
    progress: {
        totalInstructions: number;
        completedInstructions: number;
        percentComplete: number;
        nextInstruction: {
            instructionNumber: number;
            instruction: string;
        } | null;
        estimatedTimeRemaining: number;
        totalEstimatedTime: number;
    };
    timeline: Array<{
        timestamp: Date;
        type: "created" | "todo_completed" | "occurrence_updated";
        description: string;
        instructionNumber?: number;
    }>;
}

export function registerMealOccurrence(app: Hono) {
    /**
     * GET /api/meal/occurrence/:occurrenceId
     * Get detailed view of a meal occurrence including progress, todos, and timeline
     */
    app.get("/occurrence/:occurrenceId", async (c) => {
        const safeUserId = c.userId!;
        const occurrenceId = c.req.param("occurrenceId");

        try {
            // 1. Find the occurrence and verify ownership
            const occurrence = await db.query.occurrences.findFirst({
                where: and(
                    eq(occurrences.id, occurrenceId),
                    eq(occurrences.userId, safeUserId),
                    eq(occurrences.domain, "meal"),
                ),
            });

            if (!occurrence) {
                return c.json(
                    ApiResponse.error(
                        "Meal occurrence not found or access denied",
                    ),
                    StatusCodes.NOT_FOUND,
                );
            }

            // 2. Get the meal details
            const meal = await db.query.meals.findFirst({
                where: eq(meals.id, occurrence.entityId!),
            });

            if (!meal) {
                return c.json(
                    ApiResponse.error("Associated meal not found"),
                    StatusCodes.NOT_FOUND,
                );
            }

            // 3. Get all meal instructions
            const instructions = await db.query.mealInstructions.findMany({
                where: eq(mealInstructions.mealId, meal.id),
                orderBy: mealInstructions.instructionNumber,
            });

            // 4. Get all todos for this occurrence
            const occurrenceTodos = await db.query.todos.findMany({
                where: eq(todos.occurrenceId, occurrence.id),
            });

            // 5. Map todos to instructions
            const todoBySubEntityId = new Map(
                occurrenceTodos.map((todo) => [todo.subEntityId, todo]),
            );

            const instructionsWithTodos = instructions.map((instruction) => {
                const todo = todoBySubEntityId.get(instruction.id);

                return {
                    id: instruction.id,
                    instruction: instruction.instruction,
                    instructionNumber: instruction.instructionNumber,
                    estimatedDurationMinutes:
                        instruction.estimatedDurationMinutes,
                    todo: todo
                        ? {
                              id: todo.id,
                              title: todo.title,
                              completed: todo.completed,
                              completedAt: todo.completedAt,
                              scheduledFor: todo.scheduledFor,
                          }
                        : null,
                };
            });

            // 6. Calculate progress
            const completedInstructions = instructionsWithTodos.filter(
                (inst) => inst.todo?.completed,
            );
            const nextIncompleteInstruction = instructionsWithTodos.find(
                (inst) => !inst.todo?.completed,
            );

            const totalEstimatedTime = instructions.reduce(
                (sum, inst) => sum + (inst.estimatedDurationMinutes || 0),
                0,
            );
            const estimatedTimeRemaining = instructionsWithTodos
                .filter(
                    (inst) =>
                        !inst.todo?.completed && inst.estimatedDurationMinutes,
                )
                .reduce(
                    (sum, inst) => sum + (inst.estimatedDurationMinutes || 0),
                    0,
                );

            // 7. Build timeline of events
            const timeline: Array<{
                timestamp: Date;
                type: "created" | "todo_completed" | "occurrence_updated";
                description: string;
                instructionNumber?: number;
            }> = [];

            // Add occurrence creation
            timeline.push({
                timestamp: occurrence.createdAt,
                type: "created",
                description: `Meal occurrence created for ${meal.mealName}`,
            });

            // Add todo completions
            for (const instruction of instructionsWithTodos) {
                if (
                    instruction.todo?.completed &&
                    instruction.todo.completedAt
                ) {
                    timeline.push({
                        timestamp: instruction.todo.completedAt,
                        type: "todo_completed",
                        description: `Completed: ${instruction.instruction}`,
                        instructionNumber: instruction.instructionNumber,
                    });
                }
            }

            // Sort timeline chronologically
            timeline.sort(
                (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
            );

            // 8. Build response
            const response: MealOccurrenceDetails = {
                occurrence: {
                    id: occurrence.id,
                    userId: occurrence.userId,
                    domain: occurrence.domain!,
                    entityId: occurrence.entityId!,
                    targetDate: occurrence.targetDate,
                    status: occurrence.status,
                    createdAt: occurrence.createdAt,
                },
                meal: {
                    id: meal.id,
                    mealName: meal.mealName,
                    scheduledToBeEatenAt: meal.scheduledToBeEatenAt,
                    recipes: JSON.parse(meal.recipes),
                },
                instructions: instructionsWithTodos,
                progress: {
                    totalInstructions: instructions.length,
                    completedInstructions: completedInstructions.length,
                    percentComplete:
                        instructions.length > 0
                            ? Math.round(
                                  (completedInstructions.length /
                                      instructions.length) *
                                      100,
                              )
                            : 0,
                    nextInstruction: nextIncompleteInstruction
                        ? {
                              instructionNumber:
                                  nextIncompleteInstruction.instructionNumber,
                              instruction:
                                  nextIncompleteInstruction.instruction,
                          }
                        : null,
                    estimatedTimeRemaining,
                    totalEstimatedTime,
                },
                timeline,
            };

            return c.json(
                ApiResponse.success(
                    "Meal occurrence details retrieved successfully",
                    response,
                ),
            );
        } catch (error) {
            console.error("Error fetching meal occurrence:", error);
            return c.json(
                ApiResponse.error(
                    "Failed to fetch meal occurrence details",
                    error,
                ),
                StatusCodes.SERVER_ERROR,
            );
        }
    });
}
