import { z } from "zod";

export const recipeIngredientsSchema = z.object({
    recipeId: z.string().uuid(),
    ingredients: z
        .array(
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
        )
        .min(1, "You must have at least one ingredient")
        .max(50, "Maximum 50 ingredients allowed"),
});

export const recipeIngredientsUpdateSchema = recipeIngredientsSchema.extend({
    oldValues: recipeIngredientsSchema,
});

export type RecipeIngredientsType = z.infer<typeof recipeIngredientsSchema>;
export type RecipeIngredientsUpdateType = z.infer<
    typeof recipeIngredientsUpdateSchema
>;
