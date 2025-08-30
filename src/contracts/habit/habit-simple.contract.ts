import { z } from "@hono/zod-openapi";

// Simple habit creation schema for text habits
export const createTextHabitSchema = z
    .object({
        name: z.string().min(1).max(100).openapi({
            description: "Name of the habit",
            example: "Morning meditation",
        }),
        description: z.string().min(1).max(250).optional().openapi({
            description: "Optional description of the habit",
            example: "10 minutes of mindfulness meditation every morning",
        }),
        recurrenceType: z.enum(["daily", "weekly"]).openapi({
            description: "How often the habit should occur",
            example: "daily",
        }),
        recurrenceInterval: z.number().int().positive().default(1).openapi({
            description: "Interval for recurrence (e.g., every 2 days)",
            example: 1,
        }),
        startDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .openapi({
                description: "Date when the habit should start",
                example: "2024-01-15",
            }),
        timezone: z.string().optional().openapi({
            description: "Timezone for the habit schedule",
            example: "America/New_York",
        }),
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
            .optional()
            .openapi({
                description: "Days of the week for weekly habits",
                example: ["monday", "wednesday", "friday"],
            }),
        preferredTime: z
            .string()
            .regex(/^\d{2}:\d{2}$/)
            .optional()
            .openapi({
                description: "Preferred time of day for the habit",
                example: "08:00",
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
    })
    .openapi({
        title: "CreateTextHabit",
        description: "Schema for creating a simple text-based habit",
    });

// Batch habit creation schema for meal habits
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
                    startDate: z
                        .string()
                        .regex(/^\d{4}-\d{2}-\d{2}$/)
                        .openapi({
                            description: "Date when the habit should start",
                            example: "2024-01-15",
                        }),
                    timezone: z.string().optional().openapi({
                        description: "Timezone for the habit schedule",
                        example: "America/New_York",
                    }),
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
                        .optional()
                        .openapi({
                            description: "Days of the week for weekly habits",
                            example: ["monday", "wednesday", "friday"],
                        }),
                    preferredTime: z
                        .string()
                        .regex(/^\d{2}:\d{2}$/)
                        .optional()
                        .openapi({
                            description: "Preferred time of day for the habit",
                            example: "08:00",
                        }),
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

// Additional schemas needed for Flowcore
export const habitCreatedSchema = z.object({
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
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: z.string().optional(),
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
        .optional(),
});

export const habitsCreatedSchema = batchHabitCreationSchema;

export const habitUpdatedSchema = z.object({
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
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: z.string().optional(),
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
        .optional(),
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
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        timezone: z.string().optional(),
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
            .optional(),
    }),
});

export const habitArchivedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    archivedAt: z.string().datetime(),
});

// Type exports
export type CreateTextHabitType = z.infer<typeof createTextHabitSchema>;
export type BatchHabitCreationType = z.infer<typeof batchHabitCreationSchema>;
export type HabitCreatedType = z.infer<typeof habitCreatedSchema>;
export type HabitsCreatedType = z.infer<typeof habitsCreatedSchema>;
export type HabitUpdatedType = z.infer<typeof habitUpdatedSchema>;
export type HabitArchivedType = z.infer<typeof habitArchivedSchema>;
