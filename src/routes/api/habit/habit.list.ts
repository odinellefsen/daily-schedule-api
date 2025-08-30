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
            orderBy: habits.name,
        });

        // Transform for API response
        const transformedHabits = userHabits.map((habit) => ({
            id: habit.id,
            name: habit.name,
            description: habit.description,
            isActive: habit.isActive,
            recurrenceType: habit.recurrenceType,
            recurrenceInterval: habit.recurrenceInterval,
            startDate: habit.startDate,
            timezone: habit.timezone,
            weekDays: habit.weekDays,
            preferredTime: habit.preferredTime,
            relationTemplate: habit.relationTemplate
                ? JSON.parse(habit.relationTemplate)
                : null,
        }));

        return c.json(
            ApiResponse.success(
                "Habits retrieved successfully",
                transformedHabits,
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
            orderBy: habits.name,
        });

        // Transform for API response
        const transformedHabits = activeHabits.map((habit) => ({
            id: habit.id,
            name: habit.name,
            description: habit.description,
            recurrenceType: habit.recurrenceType,
            recurrenceInterval: habit.recurrenceInterval,
            startDate: habit.startDate,
            timezone: habit.timezone,
            weekDays: habit.weekDays,
            preferredTime: habit.preferredTime,
            relationTemplate: habit.relationTemplate
                ? JSON.parse(habit.relationTemplate)
                : null,
        }));

        return c.json(
            ApiResponse.success(
                "Active habits retrieved successfully",
                transformedHabits,
            ),
        );
    });
}
