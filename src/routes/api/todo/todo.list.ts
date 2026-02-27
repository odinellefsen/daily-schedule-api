// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "../../../db";
import { todos } from "../../../db/schemas";
import { generateMissingHabitTodos } from "../../../services/habit-generation";
import {
    getCurrentDateInTimezone,
    getDayBoundsInTimezone,
} from "../../../utils/timezone";

// Response schemas
const todayTodoItemSchema = z.object({
    id: z.string().uuid(),
    description: z.string().nullable(),
    scheduledFor: z.string().datetime().optional(),
    completed: z.boolean(),
    context: z.union([
        z.object({
            type: z.literal("meal"),
            mealName: z.string(),
            instructionNumber: z.number(),
            estimatedDuration: z.number().nullable(),
        }),
        z.object({
            type: z.literal("standalone"),
        }),
    ]),
    canStartNow: z.boolean(),
    isOverdue: z.boolean(),
    urgency: z.enum(["overdue", "now", "upcoming", "later"]),
});

const todayTodosResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({
        todos: z.array(todayTodoItemSchema),
        counts: z.object({
            total: z.number(),
            completed: z.number(),
            remaining: z.number(),
            overdue: z.number(),
        }),
    }),
});

const allTodosItemSchema = z.object({
    id: z.string().uuid(),
    description: z.string().nullable(),
    completed: z.boolean(),
    scheduledFor: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    relations: z.any().nullable(),
});

const allTodosResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.array(allTodosItemSchema),
});

// Route definitions
const getTodayTodosRoute = createRoute({
    method: "get",
    path: "/api/todo/today",
    tags: ["Todos"],
    security: [{ Bearer: [] }],
    request: {
        headers: z.object({
            "x-timezone": z.string().optional(),
        }),
    },
    responses: {
        200: {
            description: "Today's todos retrieved successfully",
            content: {
                "application/json": {
                    schema: todayTodosResponseSchema,
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                    }),
                },
            },
        },
    },
});

const getAllTodosRoute = createRoute({
    method: "get",
    path: "/api/todo",
    tags: ["Todos"],
    security: [{ Bearer: [] }],
    request: {
        headers: z.object({
            "x-timezone": z.string().optional(),
        }),
    },
    responses: {
        200: {
            description: "All todos retrieved successfully",
            content: {
                "application/json": {
                    schema: allTodosResponseSchema,
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                    }),
                },
            },
        },
    },
});

export function registerListTodos(app: OpenAPIHono) {
    app.openapi(getTodayTodosRoute, async (c) => {
        const safeUserId = c.userId!;

        // Get user's timezone from header, default to UTC
        const userTimezone = c.req.header("X-Timezone") || "UTC";

        // Get today's date in user's timezone (YYYY-MM-DD format)
        const todayDate = getCurrentDateInTimezone(userTimezone);

        // LAZY GENERATION: Generate missing habit todos for today, don't wait for it to complete
        generateMissingHabitTodos(safeUserId, todayDate).catch((error) => {
            console.error(
                "Failed to generate habit todos in background:",
                error,
            );
        });

        // Get today's date bounds in user's timezone, converted to UTC for database query
        const { startOfDay: startOfDayUTC, endOfDay: endOfDayUTC } =
            getDayBoundsInTimezone(userTimezone);

        const now = new Date();

        const todaysTodos = await db
            .select()
            .from(todos)
            .where(
                and(
                    eq(todos.userId, safeUserId),
                    or(
                        isNull(todos.scheduledFor),
                        and(
                            gte(todos.scheduledFor, startOfDayUTC),
                            lte(todos.scheduledFor, endOfDayUTC),
                        ),
                    ),
                ),
            )
            .orderBy(todos.scheduledFor);

        // Transform for landing page consumption
        const transformedTodos = todaysTodos.map((todo) => {
            let relations: unknown = null;
            if (todo.relations) {
                try {
                    relations = JSON.parse(todo.relations);
                } catch (error) {
                    console.warn("Invalid todo relations JSON", {
                        todoId: todo.id,
                        error,
                    });
                }
            }
            const mealRelation = relations?.[0]?.mealInstruction;

            // For time comparisons, we can work directly with UTC times since DB stores UTC
            const scheduledTime = todo.scheduledFor
                ? new Date(todo.scheduledFor)
                : null;
            const isOverdue = scheduledTime ? scheduledTime < now : false;
            const canStartNow = !scheduledTime || scheduledTime <= now;

            let urgency: "overdue" | "now" | "upcoming" | "later" = "later";
            if (isOverdue) urgency = "overdue";
            else if (canStartNow) urgency = "now";
            else if (
                scheduledTime &&
                scheduledTime.getTime() - now.getTime() <= 60 * 60 * 1000
            )
                urgency = "upcoming"; // within 1 hour

            return {
                id: todo.id,
                description: todo.description,
                scheduledFor: todo.scheduledFor?.toISOString(),
                completed: todo.completed,
                context: mealRelation
                    ? ({
                          type: "meal" as const,
                          mealName: `Step ${mealRelation.instructionNumber}`, // We'd need to fetch meal name in a real implementation
                          instructionNumber: Number(
                              mealRelation.instructionNumber,
                          ),
                          estimatedDuration: null,
                      } as const)
                    : ({
                          type: "standalone" as const,
                      } as const),
                canStartNow,
                isOverdue,
                urgency,
            };
        });

        // Calculate simple counts
        const counts = {
            total: transformedTodos.length,
            completed: transformedTodos.filter((t) => t.completed).length,
            remaining: transformedTodos.filter((t) => !t.completed).length,
            overdue: transformedTodos.filter((t) => t.urgency === "overdue")
                .length,
        };

        return c.json(
            {
                success: true as const,
                message: "Today's todos retrieved successfully",
                data: {
                    todos: transformedTodos,
                    counts,
                },
            },
            200,
        );
    });

    app.openapi(getAllTodosRoute, async (c) => {
        const safeUserId = c.userId!;

        // LAZY GENERATION: Generate missing habit todos for today when listing all todos
        const userTimezone = c.req.header("X-Timezone") || "UTC";
        const todayDate = getCurrentDateInTimezone(userTimezone);

        try {
            await generateMissingHabitTodos(safeUserId, todayDate);
        } catch (error) {
            console.error("Failed to generate habit todos:", error);
            // Continue even if habit generation fails
        }

        const allTodos = await db
            .select()
            .from(todos)
            .where(eq(todos.userId, safeUserId))
            .orderBy(todos.scheduledFor);

        const transformedTodos = allTodos.map((todo) => ({
            id: todo.id,
            description: todo.description,
            completed: todo.completed,
            scheduledFor: todo.scheduledFor?.toISOString(),
            completedAt: todo.completedAt?.toISOString(),
            relations: (() => {
                if (!todo.relations) return null;
                try {
                    return JSON.parse(todo.relations);
                } catch (error) {
                    console.warn("Invalid todo relations JSON", {
                        todoId: todo.id,
                        error,
                    });
                    return null;
                }
            })(),
        }));

        return c.json(
            {
                success: true as const,
                message: "Todos retrieved successfully",
                data: transformedTodos,
            },
            200,
        );
    });
}
