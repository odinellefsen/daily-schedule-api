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
const httpStatusOk = 200;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusInternalServerError = 500;
const todoCancelledSuccessMessage = "Todo cancelled successfully";
const invalidCancelledTodoDataMessage = "Invalid cancelled todo data";
const failedToCancelTodoMessage = "Failed to cancel todo";
const todoCancelledEventType = "todo.v0/todo.cancelled.v0";
const badRequestResponseDescription = "Bad Request";
const unauthorizedResponseDescription = "Unauthorized";
const internalServerErrorResponseDescription = "Internal Server Error";

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
        [httpStatusOk]: {
            description: todoCancelledSuccessMessage,
            content: {
                [jsonContentType]: {
                    schema: successResponseSchema,
                },
            },
        },
        [httpStatusBadRequest]: {
            description: badRequestResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusUnauthorized]: {
            description: unauthorizedResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusInternalServerError]: {
            description: internalServerErrorResponseDescription,
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
                    message: invalidCancelledTodoDataMessage,
                    errors: cancelTodoEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }
        const safeCancelTodoEvent = cancelTodoEvent.data;

        try {
            await FlowcorePathways.write(todoCancelledEventType, {
                data: safeCancelTodoEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: failedToCancelTodoMessage,
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: todoCancelledSuccessMessage,
                data: safeCancelTodoEvent,
            },
            httpStatusOk,
        );
    });
}
