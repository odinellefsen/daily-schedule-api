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
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const habitsTag = "Habits";
const httpDeleteMethod = "delete";
const deleteHabitPath = "/api/habit";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusNotFound = 404;
const httpStatusInternalServerError = 500;
const habitDeletedSuccessMessage = "Habit deleted successfully";
const habitNotFoundMessage = "Habit not found";
const invalidHabitDeletedDataMessage = "Invalid habit deleted data";
const failedToDeleteHabitMessage = "Failed to delete habit";
const habitDeletedEventType = "habit.v0/habit.deleted.v0";
const badRequestResponseDescription = "Bad Request";
const unauthorizedResponseDescription = "Unauthorized";
const notFoundResponseDescription = "Not Found";
const internalServerErrorResponseDescription = "Internal Server Error";

const deleteHabitRequestSchema = z.object({
    habitId: z.string().uuid(),
});

const successResponseSchema = createSuccessResponseSchema(habitDeletedSchema);

const deleteHabitRoute = createRoute({
    method: httpDeleteMethod,
    path: deleteHabitPath,
    tags: [habitsTag],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: deleteHabitRequestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusOk]: {
            description: habitDeletedSuccessMessage,
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
        [httpStatusNotFound]: {
            description: notFoundResponseDescription,
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
                    message: habitNotFoundMessage,
                },
                httpStatusNotFound,
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
                    message: invalidHabitDeletedDataMessage,
                    errors: habitDeletedEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }

        try {
            await FlowcorePathways.write(habitDeletedEventType, {
                data: habitDeletedEvent.data,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: failedToDeleteHabitMessage,
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: habitDeletedSuccessMessage,
                data: habitDeletedEvent.data,
            },
            httpStatusOk,
        );
    });
}
