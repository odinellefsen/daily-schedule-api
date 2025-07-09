import { z } from "zod";

export enum UnitOfMeasurementEnum {
    // Weight units
    GRAM = "Grams",
    KILOGRAM = "Kilograms",

    // Volume units
    MILLILITER = "Milliliters",
    LITER = "Liters",
    TABLESPOON = "Tablespoons",
    TEASPOON = "Teaspoons",

    // Count units
    PIECE = "Pieces",
    WHOLE = "Whole",

    // Approximate units
    PINCH = "Pinches",
    HANDFUL = "Handfuls",

    // Contextual units
    CLOVE = "Cloves", // for garlic
    SLICE = "Slices", // for bread, tomatoes
    STRIP = "Strips", // for bacon
    HEAD = "Heads", // for lettuce, cabbage
    BUNCH = "Bunches", // for herbs

    // Flexible
    TO_TASTE = "To Taste",
    AS_NEEDED = "As Needed",

    // Beverage based
    SHOT = "Shots",
    DASH = "Dashes",
    DROP = "Drops",
    SPLASH = "Splashes",
    SCOOP = "Scoops",
    DRIZZLE = "Drizzles",
}

export enum MealTimingEnum {
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

// Individual step ingredient schema
export const stepIngredientSchema = z.object({
    id: z
        .string()
        .uuid("The ID of the ingredient used in a step must be a valid UUID"),
    nameOfTheIngredientUsedInThisStep: z
        .string()
        .min(1, "The ingredient name is required")
        .max(50, "The ingredient name must be less than 50 characters"),
    quantityOfTheIngredientUsedInThisStep: z
        .number()
        .positive("Quantity used in this step must be greater than 0"),
    unitOfMeasurementOfTheIngredientQuantityUsedInThisStep: z.nativeEnum(
        UnitOfMeasurementEnum
    ),
});

// Recipe metadata schema (for recipe creation)
export const recipeMetadataSchema = z.object({
    id: z.string().uuid("The ID must be a valid UUID"),
    whenIsMealEaten: z.nativeEnum(MealTimingEnum),
    nameOfTheFoodRecipe: z
        .string()
        .min(1, "The name of the food recipe is required")
        .max(75, "The name of the food recipe must be less than 75 characters"),
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
});

// Recipe ingredients schema (for ingredients updates)
export const recipeIngredientsSchema = z.object({
    recipeId: z.string().uuid("The recipe ID must be a valid UUID"),
    ingredientsOfTheFoodRecipe: z
        .array(
            z.object({
                id: z
                    .string()
                    .uuid("The ID of the ingredient must be a valid UUID"),
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

// Recipe instructions schema (for instructions updates)
export const recipeInstructionsSchema = z.object({
    recipeId: z.string().uuid("The recipe ID must be a valid UUID"),
    stepForStepInstructionsToMakeTheFoodRecipe: z
        .array(
            z.object({
                id: z.string().uuid("The ID of the step must be a valid UUID"),
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
                    .array(stepIngredientSchema)
                    .min(
                        1,
                        "If ingredientsUsedInThisStep is NOT undefined, you must have at least one ingredient"
                    )
                    .max(
                        50,
                        "The number of ingredients used in this step must be less than 50"
                    )
                    .optional(),
            })
        )
        .min(1, "You must have at least one step")
        .max(30, "The number of steps in the recipe must be less than 30"),
});
