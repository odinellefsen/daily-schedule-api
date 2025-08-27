import { z } from "zod";

export const mealIngredientsSchema = z.object({
    mealId: z.string().uuid(),
    ingredients: z
        .array(
            z.union([
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
