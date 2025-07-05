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
    id: z.string().uuid("The ID must be a valid UUID"),
    nameOfFoodRecipe: z
        .string()
        .min(1, "The name of the food recipe is required")
        .max(75, "The name of the food recipe must be less than 75 characters"),
    generalDescriptionOfFoodRecipe: z
        .string()
        .max(
            250,
            "The general description of the food recipe must be less than 250 characters"
        ),
    ingredients: z
        .array(
            z.object({
                ingredientName: z
                    .string()
                    .min(1, "The ingredient name is required")
                    .max(
                        50,
                        "The ingredient name must be less than 50 characters"
                    ),
                ingredientQuantity: z.union([
                    z
                        .number()
                        .positive("Quantity must be greater than 0")
                        .int("Quantity must be an integer"),
                    z.literal(UnitOfMeasurement.UNKNOWN),
                ]),
                ingredientUnitOfMeasurement: z.nativeEnum(UnitOfMeasurement),
            })
        )
        .min(1, "At least one ingredient is required"),
    stepForStepInstructionsToMakeFoodRecipe: z
        .array(
            z.object({
                stepNumber: z
                    .number()
                    .positive("Step number must be greater than 0")
                    .int("Step number must be an integer"),
                instruction: z.string().min(1, "The instruction is required"),
            })
        )
        .min(
            1,
            "If you have step for step instructions field, you must have at least one step"
        )
        .optional(),
});
