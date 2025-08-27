import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import { habitSchema } from "../../../contracts/habit/habit.contract";
import { db } from "../../../db";
import { habits } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

const createHabitRequestSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    recurrenceType: z.enum(["daily", "weekly"]),
    recurrenceInterval: z.number().int().positive(),
    // if recurrenceType is weekly, then weekDays is needed
    weekDays: z
        .array(
            z.enum([
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ]),
        )
        .optional(),
    // if recurrenceType is monthly, then monthlyDay is required
    whatTimeToStart: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(), // HH:MM format
    relationTemplate: z.any().optional(), // For future extensibility
});

export function registerCreateHabit(app: Hono) {
    app.post("/", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsedJsonBody = createHabitRequestSchema.safeParse(rawJsonBody);
        if (!parsedJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid habit data",
                    parsedJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeCreateHabitJsonBody = parsedJsonBody.data;

        const existingHabit = await db.query.habits.findFirst({
            where: and(
                eq(habits.name, safeCreateHabitJsonBody.name),
                eq(habits.userId, safeUserId),
            ),
        });

        if (existingHabit) {
            return c.json(
                ApiResponse.error("Habit with name already exists"),
                StatusCodes.CONFLICT,
            );
        }

        const newHabit = {
            id: crypto.randomUUID(),
            userId: safeUserId,
            name: safeCreateHabitJsonBody.name,
        };

        const createHabitEvent = habitSchema.safeParse(newHabit);
        if (!createHabitEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid habit data",
                    createHabitEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeCreateHabitEvent = createHabitEvent.data;

        try {
            await FlowcorePathways.write("habit.v0/habit.created.v0", {
                data: safeCreateHabitEvent,
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to create habit", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Habit created successfully",
                safeCreateHabitEvent,
            ),
            StatusCodes.CREATED,
        );
    });
}
