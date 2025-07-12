// Recipe ingredients schema

import z from "zod";
import { UnitOfMeasurementEnum } from "./recipe.shared_utils";

// This schema is used to create and update ingredients for a recipe
export const recipeIngredientsSchema = z.object({
    recipeId: z.string().uuid(),
    ingredientsOfTheRecipe: z
        .array(
            z.object({
                ingredientId: z.string().uuid(),
                nameOfTheIngredient: z
                    .string()
                    .min(1, "The ingredient name is required")
                    .max(
                        50,
                        "The ingredient name must be less than 50 characters"
                    ),
                quantityOfTheIngredient: z
                    .number()
                    .positive("Quantity must be greater than 0"),
                unitOfMeasurementOfTheIngredientQuantity: z.nativeEnum(
                    UnitOfMeasurementEnum
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
