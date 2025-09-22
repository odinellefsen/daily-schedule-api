import { and, eq, gte, lte } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { todos } from "../../../db/schemas";
import { generateMissingHabitTodos } from "../../../services/habit-generation";
import { ApiResponse } from "../../../utils/api-responses";
import {
    getCurrentDateInTimezone,
    getDayBoundsInTimezone,
} from "../../../utils/timezone";

export function registerListTodos(app: Hono) {
    app.get("/today", async (c) => {
        const safeUserId = c.userId!;

        // Get user's timezone from header, default to UTC
        const userTimezone = c.req.header("X-Timezone") || "UTC";

        // Get today's date in user's timezone (YYYY-MM-DD format)
        const todayDate = getCurrentDateInTimezone(userTimezone);

        // LAZY GENERATION: Generate missing habit todos for today
        try {
            await generateMissingHabitTodos(safeUserId, todayDate);
        } catch (error) {
            console.error("Failed to generate habit todos:", error);
            // Continue even if habit generation fails
        }

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
                    gte(todos.scheduledFor, startOfDayUTC),
                    lte(todos.scheduledFor, endOfDayUTC),
                ),
            )
            .orderBy(todos.scheduledFor);

        // Transform for landing page consumption
        const transformedTodos = todaysTodos.map((todo) => {
            const relations = todo.relations
                ? JSON.parse(todo.relations)
                : null;
            const mealRelation = relations?.[0]?.mealInstruction;

            // For time comparisons, we can work directly with UTC times since DB stores UTC
            const scheduledTime = todo.scheduledFor
                ? new Date(todo.scheduledFor)
                : null;
            const isOverdue = scheduledTime && scheduledTime < now;
            const canStartNow = !scheduledTime || scheduledTime <= now;

            let urgency = "later";
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
                    ? {
                          type: "meal",
                          mealName: `Step ${mealRelation.instructionNumber}`, // We'd need to fetch meal name in a real implementation
                          instructionNumber: mealRelation.instructionNumber,
                          estimatedDuration: null, // Would come from meal step data
                      }
                    : {
                          type: "standalone",
                      },
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
            ApiResponse.success("Today's todos retrieved successfully", {
                todos: transformedTodos,
                counts,
            }),
        );
    });

    app.get("/", async (c) => {
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
            relations: todo.relations ? JSON.parse(todo.relations) : null,
        }));

        return c.json(
            ApiResponse.success(
                "Todos retrieved successfully",
                transformedTodos,
            ),
        );
    });
}
