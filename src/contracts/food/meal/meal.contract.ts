import { z } from "zod";

export const mealSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    mealName: z
        .string()
        .min(1, "Meal name is required")
        .max(100, "Meal name must be less than 100 characters"),
});

export const mealUpdateSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    mealName: z
        .string()
        .min(1, "Meal name is required")
        .max(100, "Meal name must be less than 100 characters")
        .optional(),
});

export const mealArchiveSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    reasonForArchiving: z.string().min(1, "Reason for archiving is required"),
});

// Schema for attaching recipe(s) to a meal
export const mealRecipeAttachSchema = z.object({
    mealId: z.string().uuid(),
    recipes: z
        .array(
            z.object({
                recipeId: z.string().uuid(),
                recipeVersion: z.number().int().positive(),
                orderInMeal: z.number().int().min(0),
            }),
        )
        .min(1, "At least one recipe is required"),
});

// Schema for detaching a recipe from a meal
export const mealRecipeDetachSchema = z.object({
    mealRecipeId: z.string().uuid(),
});

export type MealCreateType = z.infer<typeof mealSchema>;
export type MealUpdateType = z.infer<typeof mealUpdateSchema>;
export type MealArchiveType = z.infer<typeof mealArchiveSchema>;
export type MealRecipeAttachType = z.infer<typeof mealRecipeAttachSchema>;
export type MealRecipeDetachType = z.infer<typeof mealRecipeDetachSchema>;
