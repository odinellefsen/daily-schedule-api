import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type TodoCancelledType,
    todoCancelledSchema,
} from "../../../contracts/todo";
import { db } from "../../../db";
import { todos } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const cancelTodoRequestSchema = z.object({
    id: z.string().uuid(),
    reasonForCancelling: z.string().min(1).optional(),
});

export function registerCancelTodo(app: Hono) {
    app.patch("/cancel", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsed = cancelTodoRequestSchema.safeParse(rawJsonBody);
        if (!parsed.success) {
            return c.json(
                ApiResponse.error("Invalid todo data", parsed.error.errors),
                StatusCodes.BAD_REQUEST,
            );
        }
        const { id, reasonForCancelling } = parsed.data;

        const todoFromDb = await db.query.todos.findFirst({
            where: eq(todos.id, id),
        });

        if (!todoFromDb || todoFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Todo not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        const event: TodoCancelledType = {
            id,
            userId: safeUserId,
            cancelledAt: new Date().toISOString(),
            reasonForCancelling,
        };

        const eventParsed = todoCancelledSchema.safeParse(event);
        if (!eventParsed.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid todo cancelled data",
                    eventParsed.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        try {
            await FlowcorePathways.write("todo.v0/todo.cancelled.v0", {
                data: eventParsed.data,
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to cancel todo", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Todo cancelled successfully",
                eventParsed.data,
            ),
        );
    });
}
