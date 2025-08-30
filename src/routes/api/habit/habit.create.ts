import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import {
    batchHabitCreationSchema,
    createTextHabitSchema,
} from "../../../contracts/habit/habit-simple.contract";
// All schemas now imported from habit-simple.contract.ts

import { FlowcorePathways } from "../../../utils/flowcore";
import {
    createSuccessResponseSchema,
    ErrorResponseSchema,
} from "../../../utils/openapi-schemas";

// Using the imported createTextHabitSchema from habit-simple.contract.ts

// Success response schema for text habit creation
const textHabitSuccessResponseSchema = createSuccessResponseSchema(
    z.object({
        name: z.string(),
        recurrenceType: z.enum(["daily", "weekly"]),
    }),
    "Text habit created successfully",
);

// Success response schema for meal habits creation
const mealHabitSuccessResponseSchema = createSuccessResponseSchema(
    z.object({
        entityName: z.string(),
        habitCount: z.number(),
    }),
    "Meal habits created successfully",
);

// OpenAPI route definitions
const createTextHabitRoute = createRoute({
    method: "post",
    path: "/text",
    tags: ["Habits"],
    summary: "Create a text-based habit",
    description:
        "Creates a simple text-based habit that is not linked to any domain entity",
    security: [{ BearerAuth: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createTextHabitSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Text habit created successfully",
            content: {
                "application/json": {
                    schema: textHabitSuccessResponseSchema,
                },
            },
        },
        400: {
            description: "Invalid request data",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
        500: {
            description: "Server error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});

const createMealHabitRoute = createRoute({
    method: "post",
    path: "/meal",
    tags: ["Habits"],
    summary: "Create meal-related habits",
    description: "Creates multiple habits related to a specific meal entity",
    security: [{ BearerAuth: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: batchHabitCreationSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Meal habits created successfully",
            content: {
                "application/json": {
                    schema: mealHabitSuccessResponseSchema,
                },
            },
        },
        400: {
            description: "Invalid request data",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
        500: {
            description: "Server error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});

export function registerCreateHabit(app: OpenAPIHono) {
    // Create a simple text-based habit
    app.openapi(createTextHabitRoute, async (c) => {
        const safeUserId = c.userId!;
        const textHabitData = c.req.valid("json");

        // Convert to full habit schema (no domain fields)
        const fullHabitData = {
            userId: safeUserId,
            name: textHabitData.name,
            description: textHabitData.description,
            isActive: true,
            // No domain fields for text habits
            domain: undefined,
            entityId: undefined,
            entityName: undefined,
            subEntityId: undefined,
            subEntityName: undefined,
            recurrenceType: textHabitData.recurrenceType,
            recurrenceInterval: textHabitData.recurrenceInterval,
            startDate: textHabitData.startDate,
            timezone: textHabitData.timezone,
            weekDays: textHabitData.weekDays,
            monthlyDay: undefined,
            preferredTime: textHabitData.preferredTime,
        };

        try {
            await FlowcorePathways.write("habit.v0/habit.created.v0", {
                data: fullHabitData,
            });
        } catch (error) {
            return c.json(
                {
                    ok: false as const,
                    message: "Failed to create text habit",
                    errors: [
                        {
                            path: "",
                            message: String(error),
                            code: "server_error",
                        },
                    ],
                },
                500,
            );
        }

        return c.json(
            {
                ok: true as const,
                message: "Text habit created successfully",
                data: {
                    name: textHabitData.name,
                    recurrenceType: textHabitData.recurrenceType,
                },
            },
            201,
        );
    });

    // Create multiple meal instruction habits
    app.openapi(createMealHabitRoute, async (c) => {
        const safeUserId = c.userId!;
        const requestData = c.req.valid("json");

        // Ensure meal domain and add userId
        const mealHabitData = {
            ...requestData,
            userId: safeUserId,
            domain: "meal", // Force domain to meal for this endpoint
        };

        try {
            await FlowcorePathways.write("habit.v0/habits.created.v0", {
                data: mealHabitData,
            });
        } catch (error) {
            return c.json(
                {
                    ok: false as const,
                    message: "Failed to create meal habits",
                    errors: [
                        {
                            path: "",
                            message: String(error),
                            code: "server_error",
                        },
                    ],
                },
                500,
            );
        }

        return c.json(
            {
                ok: true as const,
                message: "Meal habits created successfully",
                data: {
                    entityName: mealHabitData.entityName,
                    habitCount: mealHabitData.habits.length,
                },
            },
            201,
        );
    });
}
