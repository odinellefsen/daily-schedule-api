import { z } from "zod";

export const mealSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    mealName: z
        .string()
        .min(1, "Meal name is required")
        .max(100, "Meal name must be less than 100 characters"),
    scheduledToBeEatenAt: z.string().datetime().optional(),
    hasMealBeenConsumed: z.boolean().default(false),
    recipes: z
        .array(
            z.object({
                recipeId: z.string().uuid(),
                recipeName: z
                    .string()
                    .min(1, "The recipe name is required")
                    .max(75, "The recipe name must be less than 75 characters"),
                recipeDescription: z
                    .string()
                    .min(1, "The recipe description is required")
                    .max(
                        250,
                        "The recipe description must be less than 250 characters"
                    ),
                recipeVersion: z.number().int().positive(),
                scalingFactor: z.number().positive().default(1.0),
            })
        )
        .min(1, "You must have at least one recipe")
        .max(20, "You can only have up to 20 recipes in a meal"),
});

export const mealUpdateSchema = mealSchema.extend({
    oldValues: mealSchema,
});

export const mealArchiveSchema = mealSchema.extend({
    reasonForArchiving: z.string().min(1, "Reason for archiving is required"),
});

export type MealCreateType = z.infer<typeof mealSchema>;
export type MealUpdateType = z.infer<typeof mealUpdateSchema>;
export type MealArchiveType = z.infer<typeof mealArchiveSchema>;
