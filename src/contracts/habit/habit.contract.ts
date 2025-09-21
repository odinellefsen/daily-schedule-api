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

// Base habit schema without validation
const baseHabitSchema = z.object({
    id: z.string().uuid().optional(),
    userId: z.string(),
    name: z.string().min(1).max(100), // Habit title/name
    description: z.string().min(1).max(250).optional(),
    isActive: z.boolean().default(true),

    // Domain reference (optional - for domain-linked habits like meal instructions)
    domain: z.string().optional(), // e.g., "meal", "workout", "reading", etc.
    entityId: z.string().uuid().optional(), // e.g., mealId, workoutId
    entityName: z.string().max(100).optional(), // e.g., meal name for display
    subEntityId: z.string().uuid().optional(), // e.g., instructionId, exerciseId
    subEntityName: z.string().max(100).optional(), // e.g., instruction text for display

    // Recurrence configuration
    recurrenceType: z.enum(["daily", "weekly"]),
    recurrenceInterval: z.number().int().positive().default(1),
    startDate: YMD,
    timezone: z.string().optional(),
    weekDays: z.array(Weekday).optional(),
    monthlyDay: z.number().int().min(1).max(31).optional(),
    preferredTime: HHMM.optional(),
});

// Single habit creation schema
export const createHabitSchema = baseHabitSchema.omit({ id: true });

// Batch habit creation schema for domain-linked habits (e.g., meal instructions)
export const batchHabitCreationSchema = z.object({
    userId: z.string(),
    domain: z.string(), // e.g., "meal"
    entityId: z.string().uuid(), // e.g., mealId
    entityName: z.string().min(1).max(100), // e.g., meal name
    habits: z
        .array(
            z.object({
                name: z.string().min(1).max(100), // Habit name/title
                description: z.string().min(1).max(250).optional(),
                subEntityId: z.string().uuid().optional(), // e.g., instructionId
                subEntityName: z.string().max(100).optional(), // e.g., instruction text
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
export const habitCreatedSchema = baseHabitSchema;
export const habitsCreatedSchema = batchHabitCreationSchema; // Batch creation event

export const habitArchivedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    archivedAt: z.string().datetime(),
});

// Type exports
export type HabitType = z.infer<typeof baseHabitSchema>;
export type CreateHabitType = z.infer<typeof createHabitSchema>;
export type BatchHabitCreationType = z.infer<typeof batchHabitCreationSchema>;
export type HabitCreatedType = z.infer<typeof habitCreatedSchema>;
export type HabitsCreatedType = z.infer<typeof habitsCreatedSchema>;
export type HabitArchivedType = z.infer<typeof habitArchivedSchema>;
