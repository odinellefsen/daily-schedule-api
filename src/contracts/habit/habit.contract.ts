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
const weeklyHabitCreationSchema = z.object({
    userId: z.string(),
    domain: z.string(), // e.g., "meal"
    entityId: z.string().uuid(), // e.g., mealId

    // Main habit configuration (so far only weekly)
    recurrenceType: z.literal("weekly"),
    targetWeekday: Weekday, // When the main event should happen
    targetTime: HHMM.optional(), // HH:MM when main event should happen
    startDate: YMD,

    subEntities: z
        .array(
            z.object({
                // as in instructions in a meal recipe
                subEntityId: z.string().uuid().optional(),
                scheduledWeekday: Weekday,
                scheduledTime: HHMM.optional(),
            }),
        )
        .min(1),
});

// Event schemas
export const habitsCreatedSchema = weeklyHabitCreationSchema;
