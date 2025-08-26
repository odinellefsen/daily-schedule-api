import z from "zod";

export const habitSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(250),
    isActive: z.boolean(),
    recurrenceType: z.enum(["daily", "weekly", "monthly"]),
    recurrenceInterval: z.number().int().positive(),
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
    monthlyDay: z.number().int().min(1).max(31).optional(),
    preferredTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(), // HH:MM format
    relationTemplate: z.any().optional(), // For future extensibility
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
