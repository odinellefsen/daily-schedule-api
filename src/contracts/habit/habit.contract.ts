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

// Weekly habit creation schema for domain-linked habits (e.g., meal instructions)
export const weeklyHabitCreationSchema = z.object({
    userId: z.string(),
    domain: z.string(), // e.g., "meal"
    entityId: z.string().uuid(), // e.g., mealId

    // Main habit configuration (weekly only)
    recurrenceType: z.literal("weekly"),
    targetWeekday: Weekday, // When the main event should happen
    startDate: YMD,
    timezone: z.string().optional(),

    // All subentities (including main event)
    subEntities: z
        .array(
            z.object({
                subEntityId: z.string().uuid().optional(), // null for main event
                scheduledWeekday: Weekday,
                scheduledTime: HHMM.optional(),
            }),
        )
        .min(1),
});

// Event schemas
export const habitsCreatedSchema = weeklyHabitCreationSchema;

export const habitArchivedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    archivedAt: z.string().datetime(),
});

// Type exports
export type HabitArchivedType = z.infer<typeof habitArchivedSchema>;
