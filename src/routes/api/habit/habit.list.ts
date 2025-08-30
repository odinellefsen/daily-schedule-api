import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { habits } from "../../../db/schemas";
import { ApiResponse } from "../../../utils/api-responses";

export function registerListHabits(app: Hono) {
    app.get("/", async (c) => {
        const safeUserId = c.userId!;

        const userHabits = await db.query.habits.findMany({
            where: eq(habits.userId, safeUserId),
            orderBy: [habits.mealName, habits.name],
        });

        // Group habits by meal for better organization
        const habitsByMeal = userHabits.reduce(
            (acc, habit) => {
                if (!acc[habit.mealId]) {
                    acc[habit.mealId] = {
                        mealId: habit.mealId,
                        mealName: habit.mealName,
                        habits: [],
                    };
                }

                acc[habit.mealId].habits.push({
                    id: habit.id,
                    name: habit.name,
                    description: habit.description,
                    isActive: habit.isActive,
                    instructionId: habit.instructionId,
                    recurrenceType: habit.recurrenceType,
                    recurrenceInterval: habit.recurrenceInterval,
                    startDate: habit.startDate,
                    timezone: habit.timezone,
                    weekDays: habit.weekDays,
                    preferredTime: habit.preferredTime,
                });

                return acc;
            },
            {} as Record<string, any>,
        );

        return c.json(
            ApiResponse.success(
                "Instruction habits retrieved successfully",
                Object.values(habitsByMeal),
            ),
        );
    });

    app.get("/active", async (c) => {
        const safeUserId = c.userId!;

        const activeHabits = await db.query.habits.findMany({
            where: and(
                eq(habits.userId, safeUserId),
                eq(habits.isActive, true),
            ),
            orderBy: [habits.mealName, habits.name],
        });

        // Group active habits by meal
        const habitsByMeal = activeHabits.reduce(
            (acc, habit) => {
                if (!acc[habit.mealId]) {
                    acc[habit.mealId] = {
                        mealId: habit.mealId,
                        mealName: habit.mealName,
                        habits: [],
                    };
                }

                acc[habit.mealId].habits.push({
                    id: habit.id,
                    name: habit.name,
                    description: habit.description,
                    instructionId: habit.instructionId,
                    recurrenceType: habit.recurrenceType,
                    recurrenceInterval: habit.recurrenceInterval,
                    startDate: habit.startDate,
                    timezone: habit.timezone,
                    weekDays: habit.weekDays,
                    preferredTime: habit.preferredTime,
                });

                return acc;
            },
            {} as Record<string, any>,
        );

        return c.json(
            ApiResponse.success(
                "Active instruction habits retrieved successfully",
                Object.values(habitsByMeal),
            ),
        );
    });

    app.get("/meal/:mealId", async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");

        const mealHabits = await db.query.habits.findMany({
            where: and(
                eq(habits.userId, safeUserId),
                eq(habits.mealId, mealId),
            ),
            orderBy: habits.name,
        });

        if (!mealHabits.length) {
            return c.json(
                ApiResponse.success("No habits found for this meal", []),
            );
        }

        const transformedHabits = mealHabits.map((habit) => ({
            id: habit.id,
            name: habit.name,
            description: habit.description,
            isActive: habit.isActive,
            instructionId: habit.instructionId,
            recurrenceType: habit.recurrenceType,
            recurrenceInterval: habit.recurrenceInterval,
            startDate: habit.startDate,
            timezone: habit.timezone,
            weekDays: habit.weekDays,
            preferredTime: habit.preferredTime,
        }));

        return c.json(
            ApiResponse.success(
                `Instruction habits for ${mealHabits[0].mealName}`,
                {
                    mealId: mealId,
                    mealName: mealHabits[0].mealName,
                    habits: transformedHabits,
                },
            ),
        );
    });
}
