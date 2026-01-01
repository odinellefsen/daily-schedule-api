import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import {
    type TodoCompletedType,
    todoCompletedSchema,
} from "../../../contracts/todo/todo.completed";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const completeTodoRequestSchema = z.object({
    id: z.string().uuid(),
});

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: todoCompletedSchema,
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

// OpenAPI route definition
const completeTodoRoute = createRoute({
    method: "post",
    path: "/api/todo",
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
                    schema: completeTodoRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Todo completed successfully",
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
                    message: "Invalid completed todo data",
                    errors: completeTodoEvent.error.errors,
                },
                400,
            );
        }
        const safeCompleteTodoEvent = completeTodoEvent.data;

        try {
            await FlowcorePathways.write("todo.v0/todo.completed.v0", {
                data: safeCompleteTodoEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to complete todo",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Todo completed successfully",
                data: safeCompleteTodoEvent,
            },
            200,
        );
    });
}
