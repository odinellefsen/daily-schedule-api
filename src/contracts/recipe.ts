import { z } from "zod";

enum UnitOfMeasurement {
    GRAMS = "grams",
    MILLILITERS = "milliliters",
    TABLESPOONS = "tablespoons",
    TEASPOONS = "teaspoons",
    PINCH = "pinch",
    HANDFUL = "handful",

    // Not in list or not known
    UNKNOWN = "unknown",
    OTHER = "other",
}

export const foodRecipeEventContract = z.object({
    id: z.string(),
    nameOfFoodRecipe: z.string(),
    ingredients: z
        .array(
            z.object({
                ingredientName: z
                    .string()
                    .min(1, "Ingredient name is required"),
                ingredientQuantity: z
                    .string()
                    .min(1, "Ingredient quantity is required"),
                unitOfMeasurement: z.nativeEnum(UnitOfMeasurement),
            })
        )
        .min(1, "At least one ingredient is required"),
});
