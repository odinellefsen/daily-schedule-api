// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import {
    type TodoCancelledType,
    todoCancelledSchema,
} from "../../../contracts/todo";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const cancelTodoRequestSchema = z.object({
    id: z.string().uuid(),
    reasonForCancelling: z.string().min(1).optional(),
});

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: todoCancelledSchema,
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

// OpenAPI route definition
const cancelTodoRoute = createRoute({
    method: "post",
    path: "/api/todo/cancel",
    tags: ["Todos"],
    security: [
        {
            Bearer: [],
        },
    ],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: cancelTodoRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Todo cancelled successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema,
                },
            },
        },
        400: {
            description: "Bad Request",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
    },
});

export function registerCancelTodo(app: OpenAPIHono) {
    app.openapi(cancelTodoRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeCancelTodoJsonBody = c.req.valid("json");

        const cancelledTodo: TodoCancelledType = {
            id: safeCancelTodoJsonBody.id,
            userId: safeUserId,
            cancelledAt: new Date().toISOString(),
            reasonForCancelling: safeCancelTodoJsonBody.reasonForCancelling,
        };

        const cancelTodoEvent = todoCancelledSchema.safeParse(cancelledTodo);
        if (!cancelTodoEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid cancelled todo data",
                    errors: cancelTodoEvent.error.errors,
                },
                400,
            );
        }
        const safeCancelTodoEvent = cancelTodoEvent.data;

        try {
            await FlowcorePathways.write("todo.v0/todo.cancelled.v0", {
                data: safeCancelTodoEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to cancel todo",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Todo cancelled successfully",
                data: safeCancelTodoEvent,
            },
            200,
        );
    });
}
