import { z } from "zod";
import { UnitOfMeasurementEnum } from "./recipe.shared_utils";

// Recipe instructions schema
// This schema is used to create and update instructions for a recipe
export const recipeInstructionsSchema = z.object({
    recipeId: z.string().uuid("The recipe ID must be a valid UUID"),
    stepByStepInstructionsToMakeTheFoodRecipe: z
        .array(
            z.object({
                stepId: z.string().uuid("The step ID must be a valid UUID"),
                stepNumber: z
                    .number()
                    .positive("Step number must be greater than 0")
                    .int("Step number must be an integer"),
                instruction: z
                    .string()
                    .min(1, "The instruction is required")
                    .max(
                        250,
                        "The instruction must be less than 250 characters"
                    ),
                ingredientsUsedInThisStep: z
                    .array(
                        z.object({
                            ingredientId: z
                                .string()
                                .uuid(
                                    "The ingredient ID used in a step must be a valid UUID"
                                ),
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
export type RecipeInstructionsType = z.infer<typeof recipeInstructionsSchema>;
