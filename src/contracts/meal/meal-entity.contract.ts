import { z } from "zod";
import { UnitOfMeasurementEnum } from "../recipe/recipe.shared_utils";

const mealCreateSchema = z.object({
    mealId: z.string().uuid("Invalid meal UUID"),
    recipeIds: z.array(z.string().uuid("Invalid recipe ID")),
});

const mealStepByStepInstructions = z.object({
    mealId: z.string().uuid("Invalid meal UUID"),
    stepByStepInstructions: z.array(
        z.object({
            recipeId: z.string().uuid("Invalid recipe UUID"),
            stepId: z.string().uuid("Invalid step UUID"),
            isStepCompleted: z.boolean(),
            stepNumber: z.number().int().min(1),
            stepInstruction: z.string().min(1),
            ingredientsForThisStep: z.array(
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
            ),
        })
    ),
});

export type MealCreateType = z.infer<typeof mealCreateSchema>;
export type MealStepByStepInstructionsType = z.infer<
    typeof mealStepByStepInstructions
>;
