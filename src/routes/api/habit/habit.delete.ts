import { and, eq } from "drizzle-orm";
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
                ApiResponse.error(
                    "Instruction habit not found or access denied",
                ),
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
                ApiResponse.error("Failed to delete instruction habit", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success("Instruction habit deleted successfully"),
        );
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
                ApiResponse.error(
                    "Instruction habit not found or access denied",
                ),
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
                ApiResponse.error(
                    "Failed to deactivate instruction habit",
                    error,
                ),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Instruction habit deactivated successfully",
                updatedHabit,
            ),
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
                ApiResponse.error(
                    "Instruction habit not found or access denied",
                ),
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
                ApiResponse.error(
                    "Failed to activate instruction habit",
                    error,
                ),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Instruction habit activated successfully",
                updatedHabit,
            ),
        );
    });

    app.delete("/meal/:mealId", async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");

        // Get all habits for this meal
        const mealHabits = await db.query.habits.findMany({
            where: and(
                eq(habits.userId, safeUserId),
                eq(habits.mealId, mealId),
            ),
        });

        if (!mealHabits.length) {
            return c.json(
                ApiResponse.error("No instruction habits found for this meal"),
                StatusCodes.NOT_FOUND,
            );
        }

        // Archive all habits for this meal
        try {
            for (const habit of mealHabits) {
                await FlowcorePathways.write("habit.v0/habit.archived.v0", {
                    data: {
                        id: habit.id,
                        userId: safeUserId,
                        archivedAt: new Date().toISOString(),
                    },
                });
            }
        } catch (error) {
            return c.json(
                ApiResponse.error(
                    "Failed to delete meal instruction habits",
                    error,
                ),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "All instruction habits for meal deleted successfully",
                {
                    mealId: mealId,
                    mealName: mealHabits[0].mealName,
                    deletedCount: mealHabits.length,
                },
            ),
        );
    });
}
