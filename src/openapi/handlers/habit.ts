import type { OpenAPIHono } from "@hono/zod-openapi";
import {
    batchHabitCreationSchema,
    createHabitSchema,
    type HabitType,
} from "../../contracts/habit/habit.contract";
import { requireAuth } from "../../middleware/auth";
import { StatusCodes } from "../../utils/api-responses";
import { FlowcorePathways } from "../../utils/flowcore";
import {
    createBatchHabitsRoute,
    createHabitRoute,
    listHabitsRoute,
} from "../routes/habit";

export function registerHabitOpenAPIRoutes(app: OpenAPIHono) {
    // Apply authentication middleware to all habit routes
    app.use("/habit/*", requireAuth());

    // Create a single habit
    app.openapi(createHabitRoute, async (c) => {
        const safeUserId = c.userId!;
        const body = c.req.valid("json");

        const parsedJsonBody = createHabitSchema.safeParse({
            ...body,
            userId: safeUserId,
        });

        if (!parsedJsonBody.success) {
            return c.json(
                {
                    ok: false,
                    error: "Invalid habit data",
                    details: parsedJsonBody.error.errors,
                },
                StatusCodes.BAD_REQUEST,
            );
        }

        const safeHabitData = parsedJsonBody.data;

        try {
            await FlowcorePathways.write("habit.v0/habit.created.v0", {
                data: safeHabitData,
            });
        } catch (error) {
            return c.json(
                {
                    ok: false,
                    error: "Failed to create habit",
                    details: error,
                },
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            {
                ok: true,
                message: "Habit created successfully",
                data: {
                    name: safeHabitData.name,
                    domain: safeHabitData.domain,
                    entityName: safeHabitData.entityName,
                    isTextHabit: !safeHabitData.domain,
                },
            },
            StatusCodes.CREATED,
        );
    });

    // Create multiple habits in batch
    app.openapi(createBatchHabitsRoute, async (c) => {
        const safeUserId = c.userId!;
        const body = c.req.valid("json");

        const parsedJsonBody = batchHabitCreationSchema.safeParse({
            ...body,
            userId: safeUserId,
        });

        if (!parsedJsonBody.success) {
            return c.json(
                {
                    ok: false,
                    error: "Invalid batch habit creation data",
                    details: parsedJsonBody.error.errors,
                },
                StatusCodes.BAD_REQUEST,
            );
        }

        const safeBatchHabitData = parsedJsonBody.data;

        try {
            await FlowcorePathways.write("habit.v0/habits.created.v0", {
                data: safeBatchHabitData,
            });
        } catch (error) {
            return c.json(
                {
                    ok: false,
                    error: "Failed to create batch habits",
                    details: error,
                },
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            {
                ok: true,
                message: "Batch habits created successfully",
                data: {
                    domain: safeBatchHabitData.domain,
                    entityName: safeBatchHabitData.entityName,
                    habitCount: safeBatchHabitData.habits.length,
                },
            },
            StatusCodes.CREATED,
        );
    });

    // List habits (placeholder implementation)
    app.openapi(listHabitsRoute, async (c) => {
        const query = c.req.valid("query");

        // This is a placeholder - you would implement actual database querying here
        // based on your existing habit.list.ts implementation

        try {
            // For now, return empty array - replace with actual logic from your existing handler
            const habits: HabitType[] = [];

            return c.json(
                {
                    ok: true,
                    message: "Habits retrieved successfully",
                    data: {
                        habits,
                        pagination: {
                            page: parseInt(query.page || "1"),
                            limit: parseInt(query.limit || "10"),
                            total: 0,
                            hasMore: false,
                        },
                    },
                },
                StatusCodes.OK,
            );
        } catch (error) {
            return c.json(
                {
                    ok: false,
                    error: "Failed to retrieve habits",
                    details: error,
                },
                StatusCodes.SERVER_ERROR,
            );
        }
    });
}
