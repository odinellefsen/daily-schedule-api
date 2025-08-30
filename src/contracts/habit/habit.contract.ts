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

export const habitSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    name: z.string().min(1).max(100), // Changed from title to match DB
    description: z.string().min(1).max(250).optional(),
    isActive: z.boolean(),

    recurrenceType: z.enum(["daily", "weekly"]),
    recurrenceInterval: z.number().int().positive().default(1),

    startDate: YMD, // anchor for intervals
    timezone: z.string().optional(),

    weekDays: z.array(Weekday).optional(), // required for weekly

    preferredTime: HHMM.optional(),
    relationTemplate: RelationTemplate.optional(), // points to domain targets
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

export const habitCreatedSchema = habitSchema;

export const habitArchivedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    archivedAt: z.string().datetime(),
});

export type HabitType = z.infer<typeof habitSchema>;
export type HabitCreatedType = z.infer<typeof habitCreatedSchema>;
export type HabitArchivedType = z.infer<typeof habitArchivedSchema>;
