import z from "zod";

// This schema is used to create and update ingredients for a recipe
export const recipeIngredientsSchema = z.object({
    recipeId: z.string().uuid(),
    ingredientsOfTheRecipe: z
        .array(
            z.object({
                id: z.string().uuid(),
                ingredientUnitAndQuantityInWords: z
                    .string()
                    .min(1, "The ingredient is required")
                    .max(
                        100,
                        "The ingredient must be less than 100 characters"
                    ),
            })
        )
        .min(1, "You must have at least one ingredient")
        .max(
            50,
            "The number of ingredients in the recipe must be less than 50"
        ),
});

export type RecipeIngredientsType = z.infer<typeof recipeIngredientsSchema>;
