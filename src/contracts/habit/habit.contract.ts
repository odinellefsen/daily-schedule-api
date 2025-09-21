import z from "zod";

/** YYYY-MM-DD */
export const YMD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** HH:MM (24h) */
export const HHMM = z.string().regex(/^\d{2}:\d{2}$/);

/** Weekday literal */
export const Weekday = z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]);

// Batch habit creation schema for domain-linked habits (e.g., meal instructions)
export const batchHabitCreationSchema = z.object({
    userId: z.string(),
    domain: z.string(), // e.g., "meal"
    entityId: z.string().uuid(), // e.g., mealId
    habits: z
        .array(
            z.object({
                subEntityId: z.string().uuid().optional(), // e.g., instructionId
                recurrenceType: z.enum(["daily", "weekly"]),
                recurrenceInterval: z.number().int().positive().default(1),
                startDate: YMD,
                timezone: z.string().optional(),
                weekDays: z.array(Weekday).optional(),
                preferredTime: HHMM.optional(),
            }),
        )
        .min(1)
        .max(20), // Allow 1-20 habits per batch
});

// Event schemas
export const habitsCreatedSchema = batchHabitCreationSchema; // Batch creation event

export const habitArchivedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    archivedAt: z.string().datetime(),
});

// Type exports
export type BatchHabitCreationType = z.infer<typeof batchHabitCreationSchema>;
export type HabitsCreatedType = z.infer<typeof habitsCreatedSchema>;
export type HabitArchivedType = z.infer<typeof habitArchivedSchema>;
