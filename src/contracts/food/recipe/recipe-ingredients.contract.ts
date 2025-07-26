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
                        "Ingredient text must be less than 150 characters"
                    ),
                sortOrder: z
                    .number()
                    .positive("Sort order must be greater than 0")
                    .int("Sort order must be an integer"),
            })
        )
        .min(1, "You must have at least one ingredient")
        .max(50, "Maximum 50 ingredients allowed"),
});

export const recipeIngredientsUpdateSchema = recipeIngredientsSchema.extend({
    oldValues: recipeIngredientsSchema,
});

export const recipeIngredientsArchiveSchema = recipeIngredientsSchema.extend({
    reasonForArchiving: z.string().min(1, "Reason for archiving is required"),
});

export type RecipeIngredientsType = z.infer<typeof recipeIngredientsSchema>;
export type RecipeIngredientsUpdateType = z.infer<
    typeof recipeIngredientsUpdateSchema
>;
export type RecipeIngredientsArchiveType = z.infer<
    typeof recipeIngredientsArchiveSchema
>;
