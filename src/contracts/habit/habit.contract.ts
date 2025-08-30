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

/** Generic domain target */
export const TargetRef = z.object({
    domain: z.string(), // e.g. "meal"
    entityId: z.string().uuid(), // e.g. mealId
});

/** Selection strategy (domain-agnostic) */
export const SelectionStrategy = z.discriminatedUnion("type", [
    z.object({ type: z.literal("fixed") }),
    z.object({ type: z.literal("rotate") }),
    z.object({ type: z.literal("random") }),
    z.object({
        type: z.literal("byWeekday"),
        map: z.record(Weekday, z.number().int().min(0)), // index into items[]
    }),
]);

/** Habit relation template (domain-agnostic wrapper; payload is domain-specific) */
export const RelationTemplate = z.object({
    strategy: SelectionStrategy,
    items: z.array(TargetRef).min(1),
    payload: z.unknown().optional(), // validated by the domain adapter at runtime
});

/** Instruction key for step-level targeting (versioned) */
export const InstructionKey = z.object({
    recipeId: z.string().uuid(),
    recipeVersion: z.number().int().positive(),
    instructionId: z.string().uuid(),
});

// Individual instruction habit schema
export const habitSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    name: z.string().min(1).max(100), // e.g. "Margherita Pizza: Mix dough"
    description: z.string().min(1).max(250).optional(),
    isActive: z.boolean(),

    // Direct instruction reference (simplified)
    instructionId: z.string().uuid(),
    mealId: z.string().uuid(),
    mealName: z.string().min(1).max(100),

    // Recurrence configuration
    recurrenceType: z.enum(["daily", "weekly"]),
    recurrenceInterval: z.number().int().positive().default(1),
    startDate: YMD,
    timezone: z.string().optional(),
    weekDays: z.array(Weekday).optional(),
    preferredTime: HHMM.optional(),
});

// Batch habit creation schema for creating multiple instruction habits at once
export const batchHabitCreationSchema = z.object({
    userId: z.string(),
    mealId: z.string().uuid(),
    mealName: z.string().min(1).max(100),
    habits: z
        .array(
            z.object({
                instructionId: z.string().uuid(),
                instructionText: z.string().min(1).max(250),
                recurrenceType: z.enum(["daily", "weekly"]),
                recurrenceInterval: z.number().int().positive().default(1),
                startDate: YMD,
                timezone: z.string().optional(),
                weekDays: z.array(Weekday).optional(),
                preferredTime: HHMM.optional(),
            }),
        )
        .min(1)
        .max(20), // Allow 1-20 instruction habits per batch
});
// .superRefine((val, ctx) => {
//     if (val.recurrenceType === "weekly") {
//         if (!val.weekDays?.length) {
//             ctx.addIssue({
//                 code: z.ZodIssueCode.custom,
//                 path: ["weekDays"],
//                 message:
//                     "weekDays is required and must be non-empty for weekly habits",
//             });
//         }
//     } else if (val.weekDays) {
//         ctx.addIssue({
//             code: z.ZodIssueCode.custom,
//             path: ["weekDays"],
//             message: "weekDays must be omitted for daily habits",
//         });
//     }
// });

// Event schemas
export const habitCreatedSchema = habitSchema;
export const habitsCreatedSchema = batchHabitCreationSchema; // NEW: Batch creation event

export const habitUpdatedSchema = habitSchema.extend({
    oldValues: habitSchema,
});

export const habitArchivedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    archivedAt: z.string().datetime(),
});

// Type exports
export type HabitType = z.infer<typeof habitSchema>;
export type BatchHabitCreationType = z.infer<typeof batchHabitCreationSchema>;
export type HabitCreatedType = z.infer<typeof habitCreatedSchema>;
export type HabitsCreatedType = z.infer<typeof habitsCreatedSchema>;
export type HabitUpdatedType = z.infer<typeof habitUpdatedSchema>;
export type HabitArchivedType = z.infer<typeof habitArchivedSchema>;
