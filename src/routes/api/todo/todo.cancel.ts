// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import {
    type TodoCancelledType,
    todoCancelledSchema,
} from "../../../contracts/todo";
import { FlowcorePathways } from "../../../utils/flowcore";
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const todosTag = "Todos";
const httpPostMethod = "post";
const cancelTodoPath = "/api/todo/cancel";
const jsonContentType = "application/json";

// Request schema
const cancelTodoRequestSchema = z.object({
    id: z.string().uuid(),
});

// Response schemas
const successResponseSchema = createSuccessResponseSchema(todoCancelledSchema);

// OpenAPI route definition
const cancelTodoRoute = createRoute({
    method: httpPostMethod,
    path: cancelTodoPath,
    tags: [todosTag],
    security: [
        {
            Bearer: [],
        },
    ],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: cancelTodoRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Todo cancelled successfully",
            content: {
                [jsonContentType]: {
                    schema: successResponseSchema,
                },
            },
        },
        400: {
            description: "Bad Request",
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        500: {
            description: "Internal Server Error",
            content: {
                [jsonContentType]: {
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
