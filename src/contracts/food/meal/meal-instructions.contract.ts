import z from "zod";

export const mealStepByStepInstructionsSchema = z.object({
    mealId: z.string().uuid(),
    stepByStepInstructions: z.array(
        z.object({
            id: z.string().uuid(),
            recipeId: z.string().uuid(),
            originalRecipeStepId: z.string().uuid(),
            isStepCompleted: z.boolean().default(false),
            stepNumber: z.number().int(),
            stepInstruction: z
                .string()
                .min(1)
                .max(250, "The instruction must be less than 250 characters"),
            estimatedDurationMinutes: z.number().int().positive().optional(),
            assignedToDate: z.string().date().optional(),
            todoId: z.string().uuid().optional(),
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
                            .max(1_000_000, "Quantity is unreasonably large")
                            .refine((n) => Math.floor(n * 1000) === n * 1000, {
                                message: "Max 3 decimal places allowed",
                            })
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
    ),
});

export const mealInstructionsUpdateSchema =
    mealStepByStepInstructionsSchema.extend({
        oldValues: mealStepByStepInstructionsSchema,
    });

export const mealInstructionsArchiveSchema =
    mealStepByStepInstructionsSchema.extend({
        reasonForArchiving: z
            .string()
            .min(1, "Reason for archiving is required"),
    });

export type MealStepByStepInstructionsType = z.infer<
    typeof mealStepByStepInstructionsSchema
>;
export type MealInstructionsUpdateType = z.infer<
    typeof mealInstructionsUpdateSchema
>;
export type MealInstructionsArchiveType = z.infer<
    typeof mealInstructionsArchiveSchema
>;
