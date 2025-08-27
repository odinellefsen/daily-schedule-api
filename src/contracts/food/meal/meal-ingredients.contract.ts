import { z } from "zod";

export const mealIngredientsSchema = z.object({
    mealId: z.string().uuid(),
    ingredients: z
        .array(
            z.discriminatedUnion("type", [
                z.object({
                    id: z.string().uuid(),
                    recipeId: z.string().uuid(),
                    ingredientText: z
                        .string()
                        .min(1, "Ingredient text is required")
                        .max(
                            150,
                            "Ingredient text must be less than 150 characters",
                        ),
                    // a meal ingredient came from the recipe instance that we attached to the meal.
                    type: z.literal("fromRecipeInstance"),
                }),
                z.object({
                    id: z.string().uuid(),
                    ingredientText: z
                        .string()
                        .min(1, "Ingredient text is required")
                        .max(
                            150,
                            "Ingredient text must be less than 150 characters",
                        ),
                    // we created a meal ingredient inside the meal so it's not from a recipe instance.
                    type: z.literal("fromTheMealItself"),
                }),
            ]),
        )
        .min(1, "You must have at least one ingredient")
        .max(50, "Maximum 50 ingredients allowed"),
});

export const mealIngredientsUpdateSchema = mealIngredientsSchema.extend({
    oldValues: mealIngredientsSchema,
});

export const mealIngredientsArchiveSchema = mealIngredientsSchema.extend({
    reasonForArchiving: z.string().min(1, "Reason for archiving is required"),
});

export type MealIngredientsType = z.infer<typeof mealIngredientsSchema>;
export type MealIngredientsUpdateType = z.infer<
    typeof mealIngredientsUpdateSchema
>;
export type MealIngredientsArchiveType = z.infer<
    typeof mealIngredientsArchiveSchema
>;
