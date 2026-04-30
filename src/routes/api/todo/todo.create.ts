// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { type TodoType, todoSchema } from "../../../contracts/todo";
import { FlowcorePathways } from "../../../utils/flowcore";
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const todosTag = "Todos";
const httpPostMethod = "post";
const createTodoPath = "/api/todo";
const jsonContentType = "application/json";

// Request schema
const createTodoRequestSchema = z.object({
    description: z
        .string()
        .min(1, "Description is required")
        .max(250, "Description must be less than 250 characters"),
    scheduledFor: z.string().datetime().optional(),
    relations: z
        .array(
            z.object({
                mealInstruction: z.object({
                    mealStepId: z.string().uuid(),
                    mealId: z.string().uuid(),
                    recipeId: z.string().uuid(),
                    instructionNumber: z.number().int().positive(),
                }),
            }),
        )
        .min(
            1,
            "if relations is NOT undefined, you must have at least one relation",
        )
        .max(5, "you can only have up to 5 relations")
        .optional(),
});

const successResponseSchema = createSuccessResponseSchema(todoSchema);

const createTodoRoute = createRoute({
    method: httpPostMethod,
    path: createTodoPath,
    tags: [todosTag],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: createTodoRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Todo created successfully",
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

export function registerCreateTodo(app: OpenAPIHono) {
    app.openapi(createTodoRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeCreateTodoJsonBody = c.req.valid("json");

        const newTodo: TodoType = {
            id: crypto.randomUUID(),
            userId: safeUserId,
            description: safeCreateTodoJsonBody.description,
            completed: false,
            scheduledFor: safeCreateTodoJsonBody.scheduledFor,
            completedAt: undefined,
            relations: safeCreateTodoJsonBody.relations,
        };

        const createTodoEvent = todoSchema.safeParse(newTodo);
        if (!createTodoEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid todo data",
                    errors: createTodoEvent.error.errors,
                },
                400,
            );
        }
        const safeCreateTodoEvent = createTodoEvent.data;

        try {
            await FlowcorePathways.write("todo.v0/todo.created.v0", {
                data: safeCreateTodoEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to create todo",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Todo created successfully",
                data: safeCreateTodoEvent,
            },
            200,
        );
    });
}
