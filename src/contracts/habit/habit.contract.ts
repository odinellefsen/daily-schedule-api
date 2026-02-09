import { z } from "@hono/zod-openapi";

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

export type WeekdayType = z.infer<typeof Weekday>;

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

// Weekly simple habit creation schema (single todo per recurrence)
const weeklySimpleHabitCreationSchema = z.object({
    userId: z.string(),
    description: z
        .string()
        .min(1, "Description is required")
        .max(250, "Description must be less than 250 characters"),
    recurrenceType: z.literal("weekly"),
    targetWeekday: Weekday,
    targetTime: HHMM.optional(),
    startDate: YMD,
});

// Event schemas
export const habitsCreatedSchema = weeklyHabitCreationSchema;
export const simpleHabitCreatedSchema = weeklySimpleHabitCreationSchema;
