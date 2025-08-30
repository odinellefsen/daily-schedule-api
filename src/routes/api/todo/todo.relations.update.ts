import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type TodoRelationsUpdatedType,
    todoRelationsUpdatedSchema,
} from "../../../contracts/todo";
import { db } from "../../../db";
import { todos } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const updateRelationsRequestSchema = z.object({
    id: z.string().uuid(),
    relations: z
        .array(
            z.object({
                mealInstruction: z
                    .object({
                        mealStepId: z.string().uuid(),
                        mealId: z.string().uuid(),
                        recipeId: z.string().uuid(),
                        instructionNumber: z.number().int().positive(),
                    })
                    .optional(),
            }),
        )
        .max(5),
});

export function registerUpdateTodoRelations(app: Hono) {
    app.patch("/relations", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsed = updateRelationsRequestSchema.safeParse(rawJsonBody);
        if (!parsed.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid todo relations",
                    parsed.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        const { id, relations } = parsed.data;

        const todoFromDb = await db.query.todos.findFirst({
            where: eq(todos.id, id),
        });

        if (!todoFromDb || todoFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Todo not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        const event: TodoRelationsUpdatedType = {
            id,
            userId: safeUserId,
            relations,
        };

        const eventParsed = todoRelationsUpdatedSchema.safeParse(event);
        if (!eventParsed.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid todo relations event",
                    eventParsed.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        try {
            await FlowcorePathways.write("todo.v0/todo.relations.updated.v0", {
                data: eventParsed.data,
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to update todo relations", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Todo relations updated successfully",
                eventParsed.data,
            ),
        );
    });
}
