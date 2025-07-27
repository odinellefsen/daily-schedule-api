import { eq } from "drizzle-orm";
import z from "zod";
import { type TodoUpdateType, todoUpdateSchema } from "../../../contracts/todo";
import { db } from "../../../db";
import { todos } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import todo from ".";

// client side request schema
const updateTodoRequestSchema = z.object({
    id: z.string().uuid(),
    description: z
        .string()
        .min(1, "Description is required")
        .max(250, "Description must be less than 250 characters"),
    completed: z.boolean(),
    scheduledFor: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
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

todo.patch("/", async (c) => {
    const safeUserId = c.userId!;

    const rawRequestJsonBody = await c.req.json();
    const parsedRequestJsonBody =
        updateTodoRequestSchema.safeParse(rawRequestJsonBody);
    if (!parsedRequestJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid todo data",
                parsedRequestJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUpdateTodoRequestBody = parsedRequestJsonBody.data;

    const todoFromDb = await db.query.todos.findFirst({
        where: eq(todos.id, safeUpdateTodoRequestBody.id),
    });

    if (!todoFromDb || todoFromDb.userId !== safeUserId) {
        return c.json(
            ApiResponse.error("Todo not found or access denied"),
            StatusCodes.NOT_FOUND
        );
    }

    const updatedTodo: TodoUpdateType = {
        id: safeUpdateTodoRequestBody.id,
        userId: safeUserId,
        description: safeUpdateTodoRequestBody.description,
        completed: safeUpdateTodoRequestBody.completed,
        scheduledFor: safeUpdateTodoRequestBody.scheduledFor,
        completedAt: safeUpdateTodoRequestBody.completedAt,
        relations: safeUpdateTodoRequestBody.relations,
        oldValues: {
            id: todoFromDb.id,
            userId: todoFromDb.userId,
            description: todoFromDb.description,
            completed: todoFromDb.completed,
            scheduledFor: todoFromDb.scheduledFor?.toISOString(),
            completedAt: todoFromDb.completedAt?.toISOString(),
            relations: todoFromDb.relations
                ? JSON.parse(todoFromDb.relations)
                : undefined,
        },
    };

    const updateTodoEvent = todoUpdateSchema.safeParse(updatedTodo);
    if (!updateTodoEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid todo data",
                updateTodoEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUpdateTodoEvent = updateTodoEvent.data;

    try {
        await FlowcorePathways.write("todo.v0/todo.updated.v0", {
            data: safeUpdateTodoEvent,
        });
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to update todo", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success("Todo updated successfully", safeUpdateTodoEvent)
    );
});

export default todo;
