import type { Hono } from "hono";
import {
    batchHabitCreationSchema,
    createHabitSchema,
} from "../../../contracts/habit/habit.contract";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

export function registerCreateHabit(app: Hono) {
    // Create a single habit (text-based or domain-linked)
    app.post("/", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsedJsonBody = createHabitSchema.safeParse({
            ...rawJsonBody,
            userId: safeUserId,
        });

        if (!parsedJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid habit data",
                    parsedJsonBody.error.errors,
                ),
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
                ApiResponse.error("Failed to create habit", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success("Habit created successfully", {
                name: safeHabitData.name,
                domain: safeHabitData.domain,
                entityName: safeHabitData.entityName,
                isTextHabit: !safeHabitData.domain,
            }),
            StatusCodes.CREATED,
        );
    });

    // Create multiple domain-linked habits in a batch (e.g., meal instructions)
    app.post("/batch", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsedJsonBody = batchHabitCreationSchema.safeParse({
            ...rawJsonBody,
            userId: safeUserId,
        });

        if (!parsedJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid batch habit creation data",
                    parsedJsonBody.error.errors,
                ),
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
                ApiResponse.error("Failed to create batch habits", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success("Batch habits created successfully", {
                domain: safeBatchHabitData.domain,
                entityName: safeBatchHabitData.entityName,
                habitCount: safeBatchHabitData.habits.length,
            }),
            StatusCodes.CREATED,
        );
    });
}
