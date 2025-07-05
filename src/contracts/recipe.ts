import { z } from "zod";

enum UnitOfMeasurement {
    GRAMS = "grams",
    MILLILITERS = "milliliters",
    TABLESPOONS = "tablespoons",
    TEASPOONS = "teaspoons",
    PINCH = "pinch",
    HANDFUL = "handful",

    UNKNOWN = "unknown",
    OTHER = "other",
}

export const foodRecipeEventContract = z.object({
    id: z.string(),
    nameOfFoodRecipe: z.string(),
    ingredients: z
        .array(
            z.object({
                ingredientName: z.string(),
                ingredientQuantity: z.union([
                    z.number(),
                    z.literal(UnitOfMeasurement.UNKNOWN),
                ]),
                unitOfMeasurement: z.nativeEnum(UnitOfMeasurement),
            })
        )
        .min(1, "At least one ingredient is required"),
});
