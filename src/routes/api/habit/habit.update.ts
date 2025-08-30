import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import { habitSchema } from "../../../contracts/habit/habit.contract";
import { db } from "../../../db";
import { habits } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

const updateHabitRequestSchema = z
    .object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().min(1).max(250).optional(),
        isActive: z.boolean().optional(),
        recurrenceType: z.enum(["daily", "weekly"]).optional(),
        recurrenceInterval: z.number().int().positive().optional(),
        startDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(), // YYYY-MM-DD
        timezone: z.string().optional(),
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
    })
    .superRefine((val, ctx) => {
        if (val.recurrenceType === "weekly") {
            if (val.weekDays !== undefined && !val.weekDays?.length) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["weekDays"],
                    message: "weekDays must be non-empty for weekly habits",
                });
            }
        }
    });

export function registerUpdateHabit(app: Hono) {
    app.patch("/:id", async (c) => {
        const safeUserId = c.userId!;
        const habitId = c.req.param("id");

        const rawJsonBody = await c.req.json();
        const parsedJsonBody = updateHabitRequestSchema.safeParse(rawJsonBody);
        if (!parsedJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid habit data",
                    parsedJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const updateData = parsedJsonBody.data;

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

        // Prepare updated habit data
        const updatedHabit = {
            ...existingHabit,
            ...updateData,
        };

        // Validate against habit schema
        const habitEvent = habitSchema.safeParse(updatedHabit);
        if (!habitEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid habit data",
                    habitEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        const safeHabitEvent = habitEvent.data;

        try {
            await FlowcorePathways.write("habit.v0/habit.updated.v0", {
                data: {
                    ...safeHabitEvent,
                    oldValues: existingHabit,
                },
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to update instruction habit", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Instruction habit updated successfully",
                safeHabitEvent,
            ),
        );
    });
}
