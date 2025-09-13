import { z } from "zod";

// Base occurrence schema
export const occurrenceSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    domain: z.string().nullable(),
    entityId: z.string().uuid().nullable(),
    subEntityId: z.string().uuid().nullable(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    habitId: z.string().uuid().nullable(),
    status: z.enum(["planned", "active", "completed", "cancelled"]),
    createdAt: z.date(),
});

// Meal occurrence specific schemas
export const mealOccurrenceDetailsSchema = z.object({
    occurrence: z.object({
        id: z.string().uuid(),
        userId: z.string(),
        domain: z.string(),
        entityId: z.string().uuid(),
        targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        status: z.enum(["planned", "active", "completed", "cancelled"]),
        createdAt: z.date(),
    }),
    meal: z.object({
        id: z.string().uuid(),
        mealName: z.string(),
        scheduledToBeEatenAt: z.date().nullable(),
        recipes: z.array(
            z.object({
                recipeId: z.string().uuid(),
                recipeName: z.string(),
                recipeDescription: z.string(),
                recipeVersion: z.number(),
            }),
        ),
    }),
    instructions: z.array(
        z.object({
            id: z.string().uuid(),
            instruction: z.string(),
            instructionNumber: z.number(),
            estimatedDurationMinutes: z.number().nullable(),
            todo: z
                .object({
                    id: z.string().uuid(),
                    title: z.string(),
                    completed: z.boolean(),
                    completedAt: z.date().nullable(),
                    scheduledFor: z.date().nullable(),
                })
                .nullable(),
        }),
    ),
    progress: z.object({
        totalInstructions: z.number(),
        completedInstructions: z.number(),
        percentComplete: z.number().min(0).max(100),
        nextInstruction: z
            .object({
                instructionNumber: z.number(),
                instruction: z.string(),
            })
            .nullable(),
        estimatedTimeRemaining: z.number().min(0),
        totalEstimatedTime: z.number().min(0),
    }),
    timeline: z.array(
        z.object({
            timestamp: z.date(),
            type: z.enum(["created", "todo_completed", "occurrence_updated"]),
            description: z.string(),
            instructionNumber: z.number().optional(),
        }),
    ),
});

// Type exports
export type Occurrence = z.infer<typeof occurrenceSchema>;
export type MealOccurrenceDetails = z.infer<typeof mealOccurrenceDetailsSchema>;

// API request/response schemas
export const getMealOccurrenceRequestSchema = z.object({
    occurrenceId: z.string().uuid(),
});

export const getMealOccurrenceResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: mealOccurrenceDetailsSchema,
});

export type GetMealOccurrenceRequest = z.infer<
    typeof getMealOccurrenceRequestSchema
>;
export type GetMealOccurrenceResponse = z.infer<
    typeof getMealOccurrenceResponseSchema
>;
