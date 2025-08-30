import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import { habitSchema } from "../../../contracts/habit/habit.contract";
import { db } from "../../../db";
import { habits } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

const createHabitRequestSchema = z
    .object({
        name: z.string().min(1).max(100),
        description: z.string().min(1).max(250).optional(),
        recurrenceType: z.enum(["daily", "weekly"]),
        recurrenceInterval: z.number().int().positive().default(1),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
        timezone: z.string().optional(),
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
        preferredTime: z
            .string()
            .regex(/^\d{2}:\d{2}$/)
            .optional(), // HH:MM format
        relationTemplate: z.any().optional(), // For domain-specific configuration
    })
    .superRefine((val, ctx) => {
        if (val.recurrenceType === "weekly") {
            if (!val.weekDays?.length) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["weekDays"],
                    message:
                        "weekDays is required and must be non-empty for weekly habits",
                });
            }
        }
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
            description: safeCreateHabitJsonBody.description,
            isActive: true,
            recurrenceType: safeCreateHabitJsonBody.recurrenceType,
            recurrenceInterval: safeCreateHabitJsonBody.recurrenceInterval,
            startDate: safeCreateHabitJsonBody.startDate,
            timezone: safeCreateHabitJsonBody.timezone,
            weekDays: safeCreateHabitJsonBody.weekDays,
            preferredTime: safeCreateHabitJsonBody.preferredTime,
            relationTemplate: safeCreateHabitJsonBody.relationTemplate
                ? JSON.stringify(safeCreateHabitJsonBody.relationTemplate)
                : null,
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
