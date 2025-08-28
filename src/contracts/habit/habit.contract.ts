import z from "zod";

export const habitSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(250),
    isActive: z.boolean(),

    recurrenceType: z.enum(["daily", "weekly"]),
    recurrenceInterval: z.number().int().positive().default(1),

    startDate: z.string().date(), // anchor point
    timezone: z.string().optional(), // optional

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

    whatTimeToStart: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(), // "HH:MM"
    relationTemplate: z.any().optional(),
});

export const habitCreatedSchema = habitSchema;
export const habitUpdatedSchema = habitSchema.extend({
    oldValues: habitSchema,
});
export const habitArchivedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    archivedAt: z.string().datetime(),
});

// Todo generation event
export const habitTodosGeneratedSchema = z.object({
    habitId: z.string().uuid(),
    userId: z.string(),
    generatedDate: z.string(), // YYYY-MM-DD
    todoIds: z.array(z.string().uuid()),
});
