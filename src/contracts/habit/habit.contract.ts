import { z } from "@hono/zod-openapi";

/** YYYY-MM-DD */
export const YMD = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .openapi({
        title: "Date",
        description: "Date in YYYY-MM-DD format",
        example: "2024-01-15",
    });

/** HH:MM (24h) */
export const HHMM = z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .openapi({
        title: "Time",
        description: "Time in HH:MM format (24-hour)",
        example: "14:30",
    });

/** Weekday literal */
export const Weekday = z
    .enum([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ])
    .openapi({
        title: "Weekday",
        description: "Day of the week",
        example: "monday",
    });

// Domain-agnostic habit schema supporting both text and domain-linked habits
export const habitSchema = z
    .object({
        id: z.string().uuid().optional().openapi({
            description: "Unique identifier for the habit",
            example: "550e8400-e29b-41d4-a716-446655440000",
        }),
        userId: z.string().openapi({
            description: "User identifier who owns this habit",
            example: "user_abc123",
        }),
        name: z.string().min(1).max(100).openapi({
            description: "Habit title/name",
            example: "Morning meditation",
        }),
        description: z.string().min(1).max(250).optional().openapi({
            description: "Optional description of the habit",
            example: "10 minutes of mindfulness meditation every morning",
        }),
        isActive: z.boolean().default(true).openapi({
            description: "Whether the habit is currently active",
            example: true,
        }),

        // Domain reference (optional - for domain-linked habits like meal instructions)
        domain: z.string().optional().openapi({
            description:
                "Domain type for linked habits (e.g., meal, workout, reading)",
            example: "meal",
        }),
        entityId: z.string().uuid().optional().openapi({
            description: "ID of the linked entity (e.g., mealId, workoutId)",
            example: "550e8400-e29b-41d4-a716-446655440001",
        }),
        entityName: z.string().max(100).optional().openapi({
            description: "Name of the linked entity for display",
            example: "Healthy breakfast bowl",
        }),
        subEntityId: z.string().uuid().optional().openapi({
            description:
                "ID of the sub-entity (e.g., instructionId, exerciseId)",
            example: "550e8400-e29b-41d4-a716-446655440002",
        }),
        subEntityName: z.string().max(100).optional().openapi({
            description: "Name of the sub-entity for display",
            example: "Mix all ingredients thoroughly",
        }),

        // Recurrence configuration
        recurrenceType: z.enum(["daily", "weekly"]).openapi({
            description: "How often the habit should occur",
            example: "daily",
        }),
        recurrenceInterval: z.number().int().positive().default(1).openapi({
            description: "Interval for recurrence (e.g., every 2 days)",
            example: 1,
        }),
        startDate: YMD.openapi({
            description: "Date when the habit should start",
        }),
        timezone: z.string().optional().openapi({
            description: "Timezone for the habit schedule",
            example: "America/New_York",
        }),
        weekDays: z
            .array(Weekday)
            .optional()
            .openapi({
                description: "Days of the week for weekly habits",
                example: ["monday", "wednesday", "friday"],
            }),
        monthlyDay: z.number().int().min(1).max(31).optional().openapi({
            description: "Day of the month for monthly habits",
            example: 15,
        }),
        preferredTime: HHMM.optional().openapi({
            description: "Preferred time of day for the habit",
        }),
    })
    .superRefine((val, ctx) => {
        if (val.recurrenceType === "weekly") {
            if (!val.weekDays?.length) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["weekDays"],
                    message:
                        "weekDays is required and must be non-empty for weekly habits",
                });
            }
        }

        // If domain is specified, entityId is required
        if (val.domain && !val.entityId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["entityId"],
                message: "entityId is required when domain is specified",
            });
        }

        // If entityId is specified, domain is required
        if (val.entityId && !val.domain) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["domain"],
                message: "domain is required when entityId is specified",
            });
        }
    })
    .openapi({
        title: "Habit",
        description: "A habit that a user wants to track and maintain",
    });

// Single habit creation schema (without ID field)
export const createHabitSchema = z
    .object({
        userId: z.string().openapi({
            description: "User identifier who owns this habit",
            example: "user_abc123",
        }),
        name: z.string().min(1).max(100).openapi({
            description: "Habit title/name",
            example: "Morning meditation",
        }),
        description: z.string().min(1).max(250).optional().openapi({
            description: "Optional description of the habit",
            example: "10 minutes of mindfulness meditation every morning",
        }),
        isActive: z.boolean().default(true).openapi({
            description: "Whether the habit is currently active",
            example: true,
        }),
        domain: z.string().optional().openapi({
            description:
                "Domain type for linked habits (e.g., meal, workout, reading)",
            example: "meal",
        }),
        entityId: z.string().uuid().optional().openapi({
            description: "ID of the linked entity (e.g., mealId, workoutId)",
            example: "550e8400-e29b-41d4-a716-446655440001",
        }),
        entityName: z.string().max(100).optional().openapi({
            description: "Name of the linked entity for display",
            example: "Healthy breakfast bowl",
        }),
        subEntityId: z.string().uuid().optional().openapi({
            description:
                "ID of the sub-entity (e.g., instructionId, exerciseId)",
            example: "550e8400-e29b-41d4-a716-446655440002",
        }),
        subEntityName: z.string().max(100).optional().openapi({
            description: "Name of the sub-entity for display",
            example: "Mix all ingredients thoroughly",
        }),
        recurrenceType: z.enum(["daily", "weekly"]).openapi({
            description: "How often the habit should occur",
            example: "daily",
        }),
        recurrenceInterval: z.number().int().positive().default(1).openapi({
            description: "Interval for recurrence (e.g., every 2 days)",
            example: 1,
        }),
        startDate: YMD,
        timezone: z.string().optional().openapi({
            description: "Timezone for the habit schedule",
            example: "America/New_York",
        }),
        weekDays: z
            .array(Weekday)
            .optional()
            .openapi({
                description: "Days of the week for weekly habits",
                example: ["monday", "wednesday", "friday"],
            }),
        monthlyDay: z.number().int().min(1).max(31).optional().openapi({
            description: "Day of the month for monthly habits",
            example: 15,
        }),
        preferredTime: HHMM.optional(),
    })
    .superRefine((val, ctx) => {
        if (val.recurrenceType === "weekly") {
            if (!val.weekDays?.length) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["weekDays"],
                    message:
                        "weekDays is required and must be non-empty for weekly habits",
                });
            }
        }
        if (val.domain && !val.entityId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["entityId"],
                message: "entityId is required when domain is specified",
            });
        }
        if (val.entityId && !val.domain) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["domain"],
                message: "domain is required when entityId is specified",
            });
        }
    })
    .openapi({
        title: "CreateHabit",
        description: "Schema for creating a new habit",
    });

// Batch habit creation schema for domain-linked habits (e.g., meal instructions)
export const batchHabitCreationSchema = z
    .object({
        userId: z.string().openapi({
            description: "User identifier who owns these habits",
            example: "user_abc123",
        }),
        domain: z.string().openapi({
            description: "Domain type for the habits",
            example: "meal",
        }),
        entityId: z.string().uuid().openapi({
            description: "ID of the linked entity",
            example: "550e8400-e29b-41d4-a716-446655440001",
        }),
        entityName: z.string().min(1).max(100).openapi({
            description: "Name of the linked entity",
            example: "Healthy breakfast bowl",
        }),
        habits: z
            .array(
                z.object({
                    name: z.string().min(1).max(100).openapi({
                        description: "Habit name/title",
                        example: "Prepare ingredients",
                    }),
                    description: z.string().min(1).max(250).optional().openapi({
                        description: "Optional habit description",
                        example: "Wash and chop all vegetables",
                    }),
                    subEntityId: z.string().uuid().optional().openapi({
                        description: "ID of the sub-entity",
                        example: "550e8400-e29b-41d4-a716-446655440002",
                    }),
                    subEntityName: z.string().max(100).optional().openapi({
                        description: "Name of the sub-entity",
                        example: "Step 1: Preparation",
                    }),
                    recurrenceType: z.enum(["daily", "weekly"]).openapi({
                        description: "How often the habit should occur",
                        example: "daily",
                    }),
                    recurrenceInterval: z
                        .number()
                        .int()
                        .positive()
                        .default(1)
                        .openapi({
                            description: "Interval for recurrence",
                            example: 1,
                        }),
                    startDate: YMD,
                    timezone: z.string().optional().openapi({
                        description: "Timezone for the habit schedule",
                        example: "America/New_York",
                    }),
                    weekDays: z
                        .array(Weekday)
                        .optional()
                        .openapi({
                            description: "Days of the week for weekly habits",
                            example: ["monday", "wednesday", "friday"],
                        }),
                    preferredTime: HHMM.optional(),
                }),
            )
            .min(1)
            .max(20)
            .openapi({
                description:
                    "Array of habits to create (1-20 habits per batch)",
                example: [
                    {
                        name: "Prepare breakfast",
                        description: "Make a healthy breakfast bowl",
                        recurrenceType: "daily",
                        recurrenceInterval: 1,
                        startDate: "2024-01-15",
                        preferredTime: "08:00",
                    },
                ],
            }),
    })
    .openapi({
        title: "BatchHabitCreation",
        description:
            "Schema for creating multiple habits at once for a domain entity",
    });

// Event schemas
export const habitCreatedSchema = habitSchema;
export const habitsCreatedSchema = batchHabitCreationSchema; // Batch creation event

export const habitUpdatedSchema = z.object({
    // Include all habit fields plus old values
    id: z.string().uuid().optional(),
    userId: z.string(),
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(250).optional(),
    isActive: z.boolean().default(true),
    domain: z.string().optional(),
    entityId: z.string().uuid().optional(),
    entityName: z.string().max(100).optional(),
    subEntityId: z.string().uuid().optional(),
    subEntityName: z.string().max(100).optional(),
    recurrenceType: z.enum(["daily", "weekly"]),
    recurrenceInterval: z.number().int().positive().default(1),
    startDate: YMD,
    timezone: z.string().optional(),
    weekDays: z.array(Weekday).optional(),
    monthlyDay: z.number().int().min(1).max(31).optional(),
    preferredTime: HHMM.optional(),
    oldValues: z.object({
        id: z.string().uuid().optional(),
        userId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().min(1).max(250).optional(),
        isActive: z.boolean().default(true),
        domain: z.string().optional(),
        entityId: z.string().uuid().optional(),
        entityName: z.string().max(100).optional(),
        subEntityId: z.string().uuid().optional(),
        subEntityName: z.string().max(100).optional(),
        recurrenceType: z.enum(["daily", "weekly"]),
        recurrenceInterval: z.number().int().positive().default(1),
        startDate: YMD,
        timezone: z.string().optional(),
        weekDays: z.array(Weekday).optional(),
        monthlyDay: z.number().int().min(1).max(31).optional(),
        preferredTime: HHMM.optional(),
    }),
});

export const habitArchivedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    archivedAt: z.string().datetime(),
});

// Type exports
export type HabitType = z.infer<typeof habitSchema>;
export type CreateHabitType = z.infer<typeof createHabitSchema>;
export type BatchHabitCreationType = z.infer<typeof batchHabitCreationSchema>;
export type HabitCreatedType = z.infer<typeof habitCreatedSchema>;
export type HabitsCreatedType = z.infer<typeof habitsCreatedSchema>;
export type HabitUpdatedType = z.infer<typeof habitUpdatedSchema>;
export type HabitArchivedType = z.infer<typeof habitArchivedSchema>;
