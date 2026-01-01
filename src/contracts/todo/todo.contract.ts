// src/contracts/todo/todo.contract.ts
import { z } from "@hono/zod-openapi";

// Relation schemas for different domains
const mealRelationSchema = z.object({
    mealId: z.string().uuid(),
    mealName: z.string().min(1).max(100), // snapshot for display
    stepId: z.string().uuid().optional(), // if todo came from specific step
    instructionNumber: z.number().int().positive().optional(),
    recipeName: z.string().optional(), // snapshot for context
});

const mealInstructionRelationSchema = z.object({
    mealStepId: z.string().uuid(),
    mealId: z.string().uuid(),
    recipeId: z.string().uuid(),
    instructionNumber: z.number().int().positive(),
});

// Main todo schema
export const todoSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    description: z
        .string()
        .min(1, "Description is required")
        .max(250, "Description must be less than 250 characters"),
    completed: z.boolean().default(false),
    scheduledFor: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),

    // Optional relations - extensible for future domains (fitness, shopping, bills, maintenance, etc.)
    // in the future, when there are more available domains, make it into a union type
    relations: z
        .array(
            z.object({
                mealInstruction: mealInstructionRelationSchema,
            }),
        )
        .min(
            1,
            "if relations is NOT undefined, you must have at least one relation",
        )
        .max(5, "you can only have up to 5 relations")
        .optional(),
});

export const todoUpdateSchema = todoSchema.extend({
    oldValues: todoSchema,
});

export const todoCancelledSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    cancelledAt: z.string().datetime(),
    reasonForCancelling: z.string().min(1).optional(),
});

export const todoRelationsUpdatedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    relations: z
        .array(
            z.object({
                mealInstruction: mealInstructionRelationSchema.optional(),
            }),
        )
        .max(5, "you can only have up to 5 relations"),
});

export type TodoType = z.infer<typeof todoSchema>;
export type TodoUpdateType = z.infer<typeof todoUpdateSchema>;
export type TodoCancelledType = z.infer<typeof todoCancelledSchema>;
export type TodoRelationsUpdatedType = z.infer<
    typeof todoRelationsUpdatedSchema
>;

// Helper schemas for handlers to validate specific relations
export const todoWithMealRelationSchema = todoSchema.extend({
    relations: z.object({
        meal: mealRelationSchema,
    }),
});

export type TodoWithMealRelationType = z.infer<
    typeof todoWithMealRelationSchema
>;
