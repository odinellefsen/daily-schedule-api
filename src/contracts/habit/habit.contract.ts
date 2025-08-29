import z from "zod";

// Generic, domain-agnostic relation template
const selectionStrategySchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("fixed") }),
    z.object({ type: z.literal("rotate") }),
    z.object({ type: z.literal("random") }),
    z.object({
        type: z.literal("byWeekday"),
        map: z.record(
            z.enum([
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ]),
            z
                .number()
                .int()
                .min(0), // index into items[]
        ),
    }),
]);

const targetRefSchema = z.object({
    domain: z.enum(["meal"]), // in the future we'd add e.g. "workout", "reading"
    entityId: z.string().uuid(),
});

const relationTemplateSchema = z.object({
    strategy: selectionStrategySchema,
    items: z.array(targetRefSchema).min(1),
});

// Prefer strict YYYY-MM-DD string (works everywhere)
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const habitSchema = z
    .object({
        id: z.string().uuid(),
        userId: z.string(),
        title: z.string().min(1).max(100),
        description: z.string().min(1).max(250),
        isActive: z.boolean(),

        recurrenceType: z.enum(["daily", "weekly"]),
        recurrenceInterval: z.number().int().positive().default(1),

        startDate: ymd,

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
            .optional(), // or keep your `whatTimeToStart`
        relationTemplate: relationTemplateSchema.optional(),
    })
    .superRefine((val, ctx) => {
        if (val.recurrenceType === "weekly") {
            if (!val.weekDays || val.weekDays.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["weekDays"],
                    message:
                        "weekDays is required and must be non-empty for weekly habits",
                });
            }
        }
        if (val.recurrenceType === "daily" && val.weekDays) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["weekDays"],
                message: "weekDays must be omitted for daily habits",
            });
        }
    });

export const habitCreatedSchema = habitSchema;

export const habitArchivedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    archivedAt: z.string().datetime(),
});

export const habitTodosGeneratedSchema = z.object({
    habitId: z.string().uuid(),
    userId: z.string().uuid().or(z.string()), // keep as string if your userId isn't UUID
    generatedDate: ymd,
    todoIds: z.array(z.string().uuid()),
});
