import z from "zod";
import { UnitOfMeasurementEnum } from "../food-item/food-item.shared_utils";

export const mealStepByStepInstructionsSchema = z.object({
    mealId: z.string().uuid(),
    stepByStepInstructions: z.array(
        z.object({
            id: z.string().uuid(),
            recipeId: z.string().uuid(),
            stepId: z.string().uuid(),
            isStepCompleted: z.boolean().default(false),
            stepNumber: z.number().int(),
            stepInstruction: z
                .string()
                .min(1)
                .max(250, "The instruction must be less than 250 characters"),
            ingredientsForThisStep: z.array(
                z.object({
                    ingredientId: z.string().uuid(),
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
            ),
        })
    ),
});

export type MealStepByStepInstructionsType = z.infer<
    typeof mealStepByStepInstructionsSchema
>;
