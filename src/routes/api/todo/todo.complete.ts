// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import {
    type TodoCompletedType,
    todoCompletedSchema,
} from "../../../contracts/todo/todo.completed";
import { FlowcorePathways } from "../../../utils/flowcore";
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const todosTag = "Todos";
const httpPostMethod = "post";
const completeTodoPath = "/api/todo/complete";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusInternalServerError = 500;
const todoCompletedSuccessMessage = "Todo completed successfully";
const invalidCompletedTodoDataMessage = "Invalid completed todo data";
const failedToCompleteTodoMessage = "Failed to complete todo";
const todoCompletedEventType = "todo.v0/todo.completed.v0";

// Request schema
const completeTodoRequestSchema = z.object({
    id: z.string().uuid(),
});

// Response schemas
const successResponseSchema = createSuccessResponseSchema(todoCompletedSchema);

// OpenAPI route definition
const completeTodoRoute = createRoute({
    method: httpPostMethod,
    path: completeTodoPath,
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
                    schema: completeTodoRequestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusOk]: {
            description: todoCompletedSuccessMessage,
            content: {
                [jsonContentType]: {
                    schema: successResponseSchema,
                },
            },
        },
        [httpStatusBadRequest]: {
            description: "Bad Request",
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusUnauthorized]: {
            description: "Unauthorized",
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusInternalServerError]: {
            description: "Internal Server Error",
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
    },
});

export function registerCompleteTodo(app: OpenAPIHono) {
    app.openapi(completeTodoRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeCompleteTodoJsonBody = c.req.valid("json");

        const completedTodo: TodoCompletedType = {
            id: safeCompleteTodoJsonBody.id,
            userId: safeUserId,
        };

        const completeTodoEvent = todoCompletedSchema.safeParse(completedTodo);
        if (!completeTodoEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: invalidCompletedTodoDataMessage,
                    errors: completeTodoEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }
        const safeCompleteTodoEvent = completeTodoEvent.data;

        try {
            await FlowcorePathways.write(todoCompletedEventType, {
                data: safeCompleteTodoEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: failedToCompleteTodoMessage,
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: todoCompletedSuccessMessage,
                data: safeCompleteTodoEvent,
            },
            httpStatusOk,
        );
    });
}
