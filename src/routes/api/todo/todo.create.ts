// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
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

export function registerCreateTodo(app: OpenAPIHono) {
    app.post("/api/todo", async (c) => {
        console.log("[todo.create/plain] entered handler");
        const safeUserId = c.userId!;
        console.log("[todo.create/plain] before req.json");
        const jsonBody = await c.req.json();
        console.log("[todo.create/plain] jsonBody", jsonBody);
        const parsedBody = createTodoRequestSchema.safeParse(jsonBody);

        if (!parsedBody.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid request body",
                    errors: parsedBody.error.errors,
                },
                400,
            );
        }

        const safeCreateTodoJsonBody = parsedBody.data;

        console.log(
            "[todo.create/plain] safeCreateTodoJsonBody",
            safeCreateTodoJsonBody,
        );

        const newTodo: TodoType = {
            id: crypto.randomUUID(),
            userId: safeUserId,
            description: safeCreateTodoJsonBody.description,
            completed: false,
            scheduledFor: safeCreateTodoJsonBody.scheduledFor,
            completedAt: undefined,
            relations: safeCreateTodoJsonBody.relations,
        };

        console.log("[todo.create/plain] newTodo", newTodo);

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

        console.log(
            "[todo.create/plain] safeCreateTodoEvent",
            safeCreateTodoEvent,
        );

        try {
            console.log("[todo.create/plain] before flowcore write");
            await FlowcorePathways.write("todo.v0/todo.created.v0", {
                data: safeCreateTodoEvent,
            });
            console.log("[todo.create/plain] after flowcore write");
        } catch (error) {
            console.log("[todo.create/plain] flowcore write failed");
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
