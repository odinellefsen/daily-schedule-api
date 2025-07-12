import { z } from "zod";

import { MealTimingEnum } from "../recipe/recipe.shared_utils";

// Base event schema - consistent with event sourcing architecture
const baseMealEventSchema = z.object({
    userId: z.string().uuid("User ID must be a valid UUID"),
    timestamp: z.string().datetime("Must be a valid ISO timestamp"),
    companyId: z.string().uuid("Company ID must be a valid UUID").optional(), // For multi-tenant support
});

// Intent-driven event: When a user expresses intent to plan a meal from a recipe
export const mealPlanningIntentSchema = baseMealEventSchema.extend({
    mealId: z.string().uuid("The meal ID must be a valid UUID"),
    recipeId: z.string().uuid("The recipe ID must be a valid UUID"),
    whenIsMealEaten: z.nativeEnum(MealTimingEnum),
    scheduledToBeEatenAt: z.string().datetime().optional(), // ISO timestamp
    intent: z.literal("meal.planning.initiated"),
    metadata: z
        .object({
            planningMethod: z
                .enum(["manual", "automated", "suggested"])
                .default("manual"),
            source: z
                .enum(["recipe_browse", "meal_planner", "quick_add"])
                .optional(),
            estimatedPrepTime: z.number().positive().optional(), // minutes
        })
        .optional(),
});

export type MealPlanningIntentType = z.infer<typeof mealPlanningIntentSchema>;

// Intent-driven event: When a meal preparation step is assigned to a task/todo
export const mealStepAssignmentIntentSchema = baseMealEventSchema.extend({
    mealStepId: z.string().uuid("The meal step ID must be a valid UUID"),
    mealId: z.string().uuid("The meal ID must be a valid UUID"),
    stepNumber: z
        .number()
        .positive()
        .int("Step number must be a positive integer"),
    todoId: z.string().uuid("The todo ID must be a valid UUID").optional(),
    assignedToUserId: z
        .string()
        .uuid("Assigned user ID must be a valid UUID")
        .optional(),
    dueDate: z.string().datetime().optional(),
    intent: z.literal("meal.step.assignment.requested"),
    metadata: z
        .object({
            priority: z.enum(["low", "medium", "high"]).default("medium"),
            estimatedDuration: z.number().positive().optional(), // minutes
            requiredIngredients: z.array(z.string().uuid()).optional(),
            notes: z.string().max(500).optional(),
        })
        .optional(),
});

export type MealStepAssignmentIntentType = z.infer<
    typeof mealStepAssignmentIntentSchema
>;

// Intent-driven event: When meal preparation is completed
export const mealPreparationCompletionIntentSchema = baseMealEventSchema.extend(
    {
        mealId: z.string().uuid("The meal ID must be a valid UUID"),
        completedSteps: z
            .array(z.string().uuid())
            .min(1, "Must have at least one completed step"),
        intent: z.literal("meal.preparation.completed"),
        metadata: z
            .object({
                actualPrepTime: z.number().positive().optional(), // minutes
                completedAt: z.string().datetime(),
                completedByUserId: z.string().uuid().optional(),
                notes: z.string().max(1000).optional(),
                rating: z.number().min(1).max(5).optional(), // 1-5 stars for recipe rating
            })
            .optional(),
    }
);

export type MealPreparationCompletionIntentType = z.infer<
    typeof mealPreparationCompletionIntentSchema
>;

// Intent-driven event: When a meal is consumed/completed
export const mealConsumptionIntentSchema = baseMealEventSchema.extend({
    mealId: z.string().uuid("The meal ID must be a valid UUID"),
    consumedAt: z.string().datetime("Must be a valid ISO timestamp"),
    intent: z.literal("meal.consumption.completed"),
    metadata: z
        .object({
            consumedByUserIds: z.array(z.string().uuid()).optional(),
            portionsConsumed: z.number().positive().optional(),
            satisfactionRating: z.number().min(1).max(5).optional(),
            notes: z.string().max(500).optional(),
            wasteAmount: z
                .enum(["none", "minimal", "moderate", "significant"])
                .optional(),
        })
        .optional(),
});

export type MealConsumptionIntentType = z.infer<
    typeof mealConsumptionIntentSchema
>;

// Intent-driven event: When a meal plan is cancelled or modified
export const mealPlanModificationIntentSchema = baseMealEventSchema.extend({
    mealId: z.string().uuid("The meal ID must be a valid UUID"),
    modificationType: z.enum([
        "cancelled",
        "postponed",
        "recipe_changed",
        "timing_changed",
    ]),
    intent: z.literal("meal.plan.modification.requested"),
    metadata: z
        .object({
            reason: z.string().max(500).optional(),
            newScheduledAt: z.string().datetime().optional(),
            newRecipeId: z.string().uuid().optional(),
            newMealTiming: z.nativeEnum(MealTimingEnum).optional(),
        })
        .optional(),
});

export type MealPlanModificationIntentType = z.infer<
    typeof mealPlanModificationIntentSchema
>;

// Union type for all meal intents - useful for pathway handlers
export type MealIntentEvent =
    | MealPlanningIntentType
    | MealStepAssignmentIntentType
    | MealPreparationCompletionIntentType
    | MealConsumptionIntentType
    | MealPlanModificationIntentType;

// Intent categories for better organization
export const MealIntentCategories = {
    PLANNING: "meal.planning.initiated",
    PREPARATION: "meal.preparation.completed",
    ASSIGNMENT: "meal.step.assignment.requested",
    CONSUMPTION: "meal.consumption.completed",
    MODIFICATION: "meal.plan.modification.requested",
} as const;

// Helper function to validate intent type
export function validateMealIntent(
    intent: string
): intent is keyof typeof MealIntentCategories {
    return Object.values(MealIntentCategories).includes(intent as any);
}
