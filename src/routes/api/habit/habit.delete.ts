import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { habits } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

export function registerDeleteHabit(app: Hono) {
    app.delete("/:id", async (c) => {
        const safeUserId = c.userId!;
        const habitId = c.req.param("id");

        // Check if habit exists and user owns it
        const existingHabit = await db.query.habits.findFirst({
            where: eq(habits.id, habitId),
        });

        if (!existingHabit || existingHabit.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Habit not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        try {
            await FlowcorePathways.write("habit.v0/habit.archived.v0", {
                data: {
                    id: habitId,
                    userId: safeUserId,
                    archivedAt: new Date().toISOString(),
                },
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to delete habit", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(ApiResponse.success("Habit deleted successfully"));
    });

    app.patch("/:id/deactivate", async (c) => {
        const safeUserId = c.userId!;
        const habitId = c.req.param("id");

        // Check if habit exists and user owns it
        const existingHabit = await db.query.habits.findFirst({
            where: eq(habits.id, habitId),
        });

        if (!existingHabit || existingHabit.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Habit not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        const updatedHabit = {
            ...existingHabit,
            isActive: false,
        };

        try {
            await FlowcorePathways.write("habit.v0/habit.updated.v0", {
                data: {
                    ...updatedHabit,
                    oldValues: existingHabit,
                },
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to deactivate habit", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success("Habit deactivated successfully", updatedHabit),
        );
    });

    app.patch("/:id/activate", async (c) => {
        const safeUserId = c.userId!;
        const habitId = c.req.param("id");

        // Check if habit exists and user owns it
        const existingHabit = await db.query.habits.findFirst({
            where: eq(habits.id, habitId),
        });

        if (!existingHabit || existingHabit.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Habit not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        const updatedHabit = {
            ...existingHabit,
            isActive: true,
        };

        try {
            await FlowcorePathways.write("habit.v0/habit.updated.v0", {
                data: {
                    ...updatedHabit,
                    oldValues: existingHabit,
                },
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to activate habit", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success("Habit activated successfully", updatedHabit),
        );
    });
}
