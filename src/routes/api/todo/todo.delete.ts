import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type TodoArchiveType,
    todoArchiveSchema,
} from "../../../contracts/todo";
import { db } from "../../../db";
import { todos } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const deleteTodoRequestSchema = z.object({
    id: z.string().uuid(),
    reasonForArchiving: z.string().min(1, "Reason for archiving is required"),
});

export function registerDeleteTodo(app: Hono) {
    app.delete("/", async (c) => {
        const safeUserId = c.userId!;

        const rawRequestJsonBody = await c.req.json();
        const parsedRequestJsonBody =
            deleteTodoRequestSchema.safeParse(rawRequestJsonBody);
        if (!parsedRequestJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid todo data",
                    parsedRequestJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeDeleteTodoRequestBody = parsedRequestJsonBody.data;

        const todoFromDb = await db.query.todos.findFirst({
            where: eq(todos.id, safeDeleteTodoRequestBody.id),
        });

        if (!todoFromDb || todoFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Todo not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        const todoArchived: TodoArchiveType = {
            id: todoFromDb.id,
            userId: todoFromDb.userId,
            description: todoFromDb.description || "",
            completed: todoFromDb.completed,
            scheduledFor: todoFromDb.scheduledFor?.toISOString(),
            completedAt: todoFromDb.completedAt?.toISOString(),
            relations: todoFromDb.relations
                ? JSON.parse(todoFromDb.relations)
                : undefined,
            reasonForArchiving: safeDeleteTodoRequestBody.reasonForArchiving,
        };

        const todoArchivedEvent = todoArchiveSchema.safeParse(todoArchived);
        if (!todoArchivedEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid todo archived data",
                    todoArchivedEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeTodoArchivedEvent = todoArchivedEvent.data;

        try {
            await FlowcorePathways.write("todo.v0/todo.archived.v0", {
                data: safeTodoArchivedEvent,
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to archive todo", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Todo archived successfully",
                safeTodoArchivedEvent,
            ),
        );
    });
}
