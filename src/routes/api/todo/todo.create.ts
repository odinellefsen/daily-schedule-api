// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { type TodoType, todoSchema } from "../../../contracts/todo";
import { FlowcorePathways } from "../../../utils/flowcore";

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

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: todoSchema,
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

// OpenAPI route definition
const createTodoRoute = createRoute({
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
                    schema: createTodoRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Todo created successfully",
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

export function registerCreateTodo(app: OpenAPIHono) {
    app.openapi(createTodoRoute, async (c) => {
        console.log("create todo route TEST TEST");
        const safeUserId = c.userId!;
        const safeCreateTodoJsonBody = c.req.valid("json");

        console.log("valid json atleast");

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

        console.log("valid event payload, trying to send event");

        try {
            await FlowcorePathways.write("todo.v0/todo.created.v0", {
                data: safeCreateTodoEvent,
            });
        } catch (error) {
            console.log("event failed");
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
