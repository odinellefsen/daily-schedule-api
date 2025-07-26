import { z } from "zod";

// This schema is used to create and update instructions for a recipe
export const recipeInstructionsSchema = z.object({
    recipeId: z.string().uuid(),
    stepByStepInstructions: z
        .array(
            z.object({
                id: z.string().uuid(),
                stepNumber: z
                    .number()
                    .positive("Step number must be greater than 0")
                    .int("Step number must be an integer"),
                stepInstruction: z
                    .string()
                    .min(1, "The instruction is required")
                    .max(
                        250,
                        "The instruction must be less than 250 characters"
                    ),
                ingredientsUsedInStep: z
                    .array(
                        z.object({
                            foodItemUnitId: z.string().uuid(),
                            foodItemId: z.string().uuid(),
                            quantityOfFoodItemUnit: z
                                .number()
                                .positive(
                                    "Quantity used in this step must be greater than 0"
                                )
                                .max(
                                    1_000_000,
                                    "Quantity is unreasonably large"
                                )
                                .refine(
                                    (n) => Math.floor(n * 1000) === n * 1000,
                                    {
                                        message: "Max 3 decimal places allowed",
                                    }
                                )
                                .default(1),
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
