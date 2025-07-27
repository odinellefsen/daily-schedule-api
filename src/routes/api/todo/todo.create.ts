import { and, eq } from "drizzle-orm";
import z from "zod";
import { type TodoType, todoSchema } from "../../../contracts/todo";
import { db } from "../../../db";
import { todos } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import todo from ".";

// client side request schema
const createTodoRequestSchema = z.object({
    description: z
        .string()
        .min(1, "Description is required")
        .max(250, "Description must be less than 250 characters"),
    scheduledFor: z.string().datetime().optional(),
    relations: z
        .array(
            z.object({
                mealInstruction: z
                    .object({
                        mealStepId: z.string().uuid(),
                        mealId: z.string().uuid(),
                        recipeId: z.string().uuid(),
                        stepNumber: z.number().int().positive(),
                    })
                    .optional(),
            })
        )
        .min(
            1,
            "if relations is NOT undefined, you must have at least one relation"
        )
        .max(5, "you can only have up to 5 relations")
        .optional(),
});

todo.post("/", async (c) => {
    const safeUserId = c.userId!;

    const rawJsonBody = await c.req.json();
    const parsedJsonBody = createTodoRequestSchema.safeParse(rawJsonBody);
    if (!parsedJsonBody.success) {
        return c.json(
            ApiResponse.error("Invalid todo data", parsedJsonBody.error.errors),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateTodoJsonBody = parsedJsonBody.data;

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
            ApiResponse.error(
                "Invalid todo data",
                createTodoEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateTodoEvent = createTodoEvent.data;

    try {
        await FlowcorePathways.write("todo.v0/todo.created.v0", {
            data: safeCreateTodoEvent,
        });
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to create todo", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success("Todo created successfully", safeCreateTodoEvent)
    );
});

export default todo;
