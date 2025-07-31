import { and, eq, gte, lte } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { todos } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

export function registerListTodos(app: Hono) {
    app.get("/today", async (c) => {
        const safeUserId = c.userId!;

        // Get today's date range
        const today = new Date();
        const startOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );
        const endOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1
        );

        const todaysTodos = await db
            .select()
            .from(todos)
            .where(
                and(
                    eq(todos.userId, safeUserId),
                    gte(todos.scheduledFor, startOfDay),
                    lte(todos.scheduledFor, endOfDay)
                )
            )
            .orderBy(todos.scheduledFor);

        // Transform for landing page consumption
        const transformedTodos = todaysTodos.map((todo) => {
            const relations = todo.relations
                ? JSON.parse(todo.relations)
                : null;
            const mealRelation = relations?.[0]?.mealInstruction;

            const now = new Date();
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
                          mealName: `Step ${mealRelation.stepNumber}`, // We'd need to fetch meal name in a real implementation
                          stepNumber: mealRelation.stepNumber,
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
            })
        );
    });

    app.get("/", async (c) => {
        const safeUserId = c.userId!;

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
                transformedTodos
            )
        );
    });
}
