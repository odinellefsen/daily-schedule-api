import { z } from "zod";

export const mealSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    hasMealBeenConsumed: z.boolean().default(false),
    recipes: z
        .array(
            z.object({
                recipeId: z.string().uuid(),
                recipeName: z
                    .string()
                    .min(1, "The recipe name is required")
                    .max(75, "The recipe name must be less than 75 characters"),
            })
        )
        .min(1, "You must have at least one recipe")
        .max(20, "You can only have up to 20 recipes in a meal"),
});

export type MealCreateType = z.infer<typeof mealSchema>;
