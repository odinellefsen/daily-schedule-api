// src/contracts/todo/todo.contract.ts
import { z } from "zod";

// Relation schemas for different domains
const mealRelationSchema = z.object({
    mealId: z.string().uuid(),
    mealName: z.string().min(1).max(100), // snapshot for display
    stepId: z.string().uuid().optional(), // if todo came from specific step
    stepNumber: z.number().int().positive().optional(),
    recipeName: z.string().optional(), // snapshot for context
});

const mealInstructionRelationSchema = z.object({
    mealStepId: z.string().uuid(),
    mealId: z.string().uuid(),
    recipeId: z.string().uuid(),
    stepNumber: z.number().int().positive(),
});

// Main todo schema
export const todoSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    description: z
        .string()
        .min(1, "Description is required")
        .max(250, "Description must be less than 250 characters"),
    completed: z.boolean().default(false),
    scheduledFor: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),

    // Optional relations - extensible for future domains
    // in the future, when there are more available domains, make it into a union type
    relations: z
        .array(
            z.object({
                mealInstruction: mealInstructionRelationSchema.optional(),
                // Future: fitness, shopping, bills, maintenance, etc.
            })
        )
        .min(
            1,
            "if relations is NOT undefined, you must have at least one relation"
        )
        .max(5, "you can only have up to 5 relations")
        .optional(),
});

export const todoUpdateSchema = todoSchema.extend({
    oldValues: todoSchema,
});

export const todoArchiveSchema = todoSchema.extend({
    reasonForArchiving: z.string().min(1, "Reason for archiving is required"),
});

export type TodoType = z.infer<typeof todoSchema>;
export type TodoUpdateType = z.infer<typeof todoUpdateSchema>;
export type TodoArchiveType = z.infer<typeof todoArchiveSchema>;

// Helper schemas for handlers to validate specific relations
export const todoWithMealRelationSchema = todoSchema.extend({
    relations: z.object({
        meal: mealRelationSchema,
    }),
});

export type TodoWithMealRelationType = z.infer<
    typeof todoWithMealRelationSchema
>;
