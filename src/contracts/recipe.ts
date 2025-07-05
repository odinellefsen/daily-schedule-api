import { z } from "zod";

enum UnitOfMeasurementEnum {
    // Weight units
    GRAMS = "Gram",
    KILOGRAMS = "Kilogram",

    // Volume units
    MILLILITERS = "Milliliter",
    LITERS = "Liter",
    TABLESPOONS = "Tablespoon",
    TEASPOONS = "Teaspoon",

    // Count units (NEW!)
    PIECES = "Piece",
    WHOLE = "Whole",
    EACH = "Each",
    ITEMS = "Item",

    // Approximate units
    PINCH = "Pinch",
    HANDFUL = "Handful",

    // Contextual units (NEW!)
    CLOVES = "Clove", // for garlic
    SLICES = "Slice", // for bread, tomatoes
    STRIPS = "Strip", // for bacon
    HEADS = "Head", // for lettuce, cabbage
    BUNCHES = "Bunch", // for herbs

    // Flexible
    TO_TASTE = "To Taste",
    AS_NEEDED = "As Needed",
}

enum MealTimingEnum {
    BREAKFAST = "Breakfast",
    BRUNCH = "Brunch",
    LUNCH = "Lunch",
    DINNER = "Dinner",
    ON_THE_GO = "On The Go",
    SNACK = "Snack",
    LATE_NIGHT = "Late Night",
    AFTERNOON_TEA = "Afternoon Tea",
    SUPPER = "Supper",
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
            .min(
                1,
                "If generalDescriptionOfTheFoodRecipe is NOT undefined, you must have at least one character"
            )
            .max(
                250,
                "The general description of the food recipe must be less than 250 characters"
            )
            .optional(),

        ingredientsOfTheFoodRecipe: z
            .array(
                z.object({
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
            .min(
                1,
                "If ingredientsOfTheFoodRecipe is NOT undefined, you must have at least one ingredient"
            )
            .optional(),
        stepForStepInstructionsToMakeTheFoodRecipe: z
            .array(
                z.object({
                    stepNumber: z
                        .number()
                        .positive("Step number must be greater than 0")
                        .int("Step number must be an integer"),
                    instruction: z
                        .string()
                        .min(1, "The instruction is required")
                        .max(
                            250,
                            "The instruction must be less than 150 characters"
                        ),
                    ingredientsUsedInThisStep: z
                        .array(
                            z.object({
                                nameOfTheIngredientUsedInThisStep: z
                                    .string()
                                    .min(1, "The ingredient name is required")
                                    .max(
                                        50,
                                        "The ingredient name must be less than 50 characters"
                                    ),
                                quantityOfTheIngredientUsedInThisStep: z
                                    .number()
                                    .positive(
                                        "Quantity used in this step must be greater than 0"
                                    ),
                                unitOfMeasurementOfTheIngredientQuantityUsedInThisStep:
                                    z.nativeEnum(UnitOfMeasurementEnum),
                            })
                        )
                        .min(
                            1,
                            "If ingredientsUsedInThisStep is NOT undefined, you must have at least one ingredient"
                        )
                        .optional(),
                })
            )
            .min(
                1,
                "If stepForStepInstructionsToMakeTheFoodRecipe is NOT undefined, you must have at least one step"
            )
            .optional(),
        whenIsMealEaten: z.nativeEnum(MealTimingEnum),
    })
    .refine(
        (data) => {
            if (!data.stepForStepInstructionsToMakeTheFoodRecipe) {
                // If there are no steps by step instructions, we don't need to check if ingredients are used in steps
                return true;
            }

            // Get all ingredient names
            const ingredientNames =
                data.ingredientsOfTheFoodRecipe?.map(
                    (ing) => ing.nameOfTheIngredient
                ) ?? [];

            // Check if all ingredient's names used in steps exist in ingredients array
            return (
                data.stepForStepInstructionsToMakeTheFoodRecipe?.every(
                    (step) =>
                        step.ingredientsUsedInThisStep?.every(
                            (usedIngredient) =>
                                ingredientNames.includes(
                                    usedIngredient.nameOfTheIngredientUsedInThisStep
                                )
                        ) ?? true
                ) ?? true
            );
        },
        {
            message:
                "The field values of nameOfTheIngredientUsedInThisStep must also be defined in the ingredientsOfTheFoodRecipe array",
            path: ["stepForStepInstructionsToMakeTheFoodRecipe"],
        }
    );
