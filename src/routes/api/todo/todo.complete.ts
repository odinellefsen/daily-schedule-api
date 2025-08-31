import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type TodoCompletedType,
    todoCompletedSchema,
} from "../../../contracts/todo";
import { db } from "../../../db";
import { todos } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const completeTodoRequestSchema = z.object({
    id: z.string().uuid(),
});

export function registerCompleteTodo(app: Hono) {
    app.patch("/complete", async (c) => {
        const safeUserId = c.userId!;

        const rawRequestJsonBody = await c.req.json();
        const parsedRequestJsonBody =
            completeTodoRequestSchema.safeParse(rawRequestJsonBody);
        if (!parsedRequestJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid todo data",
                    parsedRequestJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeBody = parsedRequestJsonBody.data;

        const todoFromDb = await db.query.todos.findFirst({
            where: eq(todos.id, safeBody.id),
        });

        if (!todoFromDb || todoFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Todo not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        const completedEvent: TodoCompletedType = {
            id: safeBody.id,
            userId: safeUserId,
            completedAt: new Date().toISOString(),
        };

        const parsed = todoCompletedSchema.safeParse(completedEvent);
        if (!parsed.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid todo completed data",
                    parsed.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        try {
            await FlowcorePathways.write("todo.v0/todo.completed.v0", {
                data: parsed.data,
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to complete todo", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success("Todo completed successfully", parsed.data),
        );
    });
}
