import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import {
    ErrorResponseSchema,
    HHMMSchema,
    StatusCodes,
    SuccessResponseSchema,
    WeekdaySchema,
    YMDSchema,
} from "../schemas";

// Convert your existing habit schemas to OpenAPI format
const CreateHabitSchema = z.object({
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
    startDate: YMDSchema,
    timezone: z.string().optional(),
    weekDays: z.array(WeekdaySchema).optional(),
    monthlyDay: z.number().int().min(1).max(31).optional(),
    preferredTime: HHMMSchema.optional(),
});

const HabitSchema = CreateHabitSchema.extend({
    id: z.string().uuid().optional(),
    userId: z.string(),
});

const BatchHabitCreationSchema = z.object({
    domain: z.string(),
    entityId: z.string().uuid(),
    entityName: z.string().min(1).max(100),
    habits: z.array(CreateHabitSchema).min(1).max(20),
});

// OpenAPI route definitions
export const createHabitRoute = createRoute({
    method: "post",
    path: "/habit",
    tags: ["Habits"],
    summary: "Create a new habit",
    description: "Create a single habit (text-based or domain-linked)",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: CreateHabitSchema,
                },
            },
            description: "Habit data to create",
        },
    },
    responses: {
        [StatusCodes.CREATED]: {
            content: {
                "application/json": {
                    schema: SuccessResponseSchema.extend({
                        data: z.object({
                            name: z.string(),
                            domain: z.string().optional(),
                            entityName: z.string().optional(),
                            isTextHabit: z.boolean(),
                        }),
                    }),
                },
            },
            description: "Habit created successfully",
        },
        [StatusCodes.BAD_REQUEST]: {
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
            description: "Invalid habit data",
        },
        [StatusCodes.SERVER_ERROR]: {
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
            description: "Failed to create habit",
        },
    },
});

export const createBatchHabitsRoute = createRoute({
    method: "post",
    path: "/habit/batch",
    tags: ["Habits"],
    summary: "Create multiple habits in batch",
    description:
        "Create multiple domain-linked habits in a batch (e.g., meal instructions)",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: BatchHabitCreationSchema,
                },
            },
            description: "Batch habit creation data",
        },
    },
    responses: {
        [StatusCodes.CREATED]: {
            content: {
                "application/json": {
                    schema: SuccessResponseSchema.extend({
                        data: z.object({
                            domain: z.string(),
                            entityName: z.string(),
                            habitCount: z.number(),
                        }),
                    }),
                },
            },
            description: "Batch habits created successfully",
        },
        [StatusCodes.BAD_REQUEST]: {
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
            description: "Invalid batch habit creation data",
        },
        [StatusCodes.SERVER_ERROR]: {
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
            description: "Failed to create batch habits",
        },
    },
});

export const listHabitsRoute = createRoute({
    method: "get",
    path: "/habit",
    tags: ["Habits"],
    summary: "List user habits",
    description: "Get a list of habits for the authenticated user",
    request: {
        query: z.object({
            domain: z.string().optional(),
            isActive: z.string().optional(),
            page: z.string().optional(),
            limit: z.string().optional(),
        }),
    },
    responses: {
        [StatusCodes.OK]: {
            content: {
                "application/json": {
                    schema: SuccessResponseSchema.extend({
                        data: z.object({
                            habits: z.array(HabitSchema),
                            pagination: z.object({
                                page: z.number(),
                                limit: z.number(),
                                total: z.number(),
                                hasMore: z.boolean(),
                            }),
                        }),
                    }),
                },
            },
            description: "Habits retrieved successfully",
        },
        [StatusCodes.SERVER_ERROR]: {
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
            description: "Failed to retrieve habits",
        },
    },
});

// Export schemas for reuse
export { CreateHabitSchema, HabitSchema, BatchHabitCreationSchema };
