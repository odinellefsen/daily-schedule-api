// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import {
    type HabitDeletedType,
    habitDeletedSchema,
} from "../../../contracts/habit/habit.contract";
import { db } from "../../../db";
import { habits } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

const deleteHabitRequestSchema = z.object({
    habitId: z.string().uuid(),
});

const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: habitDeletedSchema,
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

const deleteHabitRoute = createRoute({
    method: "delete",
    path: "/api/habit",
    tags: ["Habits"],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: deleteHabitRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Habit deleted successfully",
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
        404: {
            description: "Not Found",
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

export function registerDeleteHabit(app: OpenAPIHono) {
    app.openapi(deleteHabitRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeDeleteHabitRequestBody = c.req.valid("json");

        const habitFromDb = await db.query.habits.findFirst({
            where: and(
                eq(habits.id, safeDeleteHabitRequestBody.habitId),
                eq(habits.userId, safeUserId),
            ),
        });

        if (!habitFromDb) {
            return c.json(
                {
                    success: false as const,
                    message: "Habit not found",
                },
                404,
            );
        }

        const habitDeleted: HabitDeletedType = {
            habitId: habitFromDb.id,
        };

        const habitDeletedEvent = habitDeletedSchema.safeParse(habitDeleted);
        if (!habitDeletedEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid habit deleted data",
                    errors: habitDeletedEvent.error.errors,
                },
                400,
            );
        }

        try {
            await FlowcorePathways.write("habit.v0/habit.deleted.v0", {
                data: habitDeletedEvent.data,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to delete habit",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Habit deleted successfully",
                data: habitDeletedEvent.data,
            },
            200,
        );
    });
}
