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

export const foodRecipeEventContract = z
    .object({
        id: z.string().uuid("The ID must be a valid UUID"),
        nameOfTheFoodRecipe: z
            .string()
            .min(1, "The name of the food recipe is required")
            .max(
                75,
                "The name of the food recipe must be less than 75 characters"
            ),
        generalDescriptionOfTheFoodRecipe: z
            .string()
            .max(
                250,
                "The general description of the food recipe must be less than 250 characters"
            ),
        ingredientsOfTheFoodRecipe: z
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
                    ingredientUnitOfMeasurement:
                        z.nativeEnum(UnitOfMeasurement),
                })
            )
            .min(
                1,
                "If you have ingredients array, you must have at least one ingredient"
            )
            .optional(),
        stepForStepInstructionsToMakeTheFoodRecipe: z
            .array(
                z.object({
                    stepNumber: z.number().positive().int(),
                    instruction: z.string().min(1),
                    ingredientsUsedInThisStep: z.array(z.string()).optional(),
                })
            )
            .min(
                1,
                "If you have step for step instructions array, you must have at least one step"
            )
            .optional(),
    })
    .refine(
        (data) => {
            if (
                !data.ingredientsOfTheFoodRecipe ||
                !data.stepForStepInstructionsToMakeTheFoodRecipe
            ) {
                return true;
            }

            // Get all ingredient names
            const ingredientNames = data.ingredientsOfTheFoodRecipe.map(
                (ing) => ing.ingredientName
            );

            // Check if all ingredients used in steps exist in ingredients array
            return (
                data.stepForStepInstructionsToMakeTheFoodRecipe?.every(
                    (step) =>
                        step.ingredientsUsedInThisStep?.every(
                            (usedIngredient) =>
                                ingredientNames.includes(usedIngredient)
                        ) ?? true
                ) ?? true
            );
        },
        {
            message:
                "All ingredients used in steps must be defined in the ingredients array",
            path: ["stepForStepInstructionsToMakeTheFoodRecipe"],
        }
    );
