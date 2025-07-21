import { z } from "zod";
import { UnitOfMeasurementEnum } from "../recipe";

export const foodItemUnitSchema = z.object({
    // Each food can have multiple units with their own nutrition
    foodItemId: z.string().uuid(),
    units: z
        .array(
            z.object({
                id: z.string().uuid(),
                unitOfMeasurement: z.nativeEnum(UnitOfMeasurementEnum),
                unitDescription: z // e.g., "a medium whole apple (about 180g)", "a large whole apple (about 220g)", "a thick slice of bread (about 30g)"
                    .string()
                    .max(
                        100,
                        "Unit description must be less than 100 characters"
                    )
                    .optional(),
                // Nutrition per 1 unit (of selected unit)
                // for example per "WHOLE" apple, per "SLICE" of bread, per "CLOVE" of garlic, etc.
                nutritionPerOfThisUnit: z.object({
                    calories: z
                        .number()
                        .min(0, "Calories must be 0 or greater"),
                    proteinInGrams: z // in grams
                        .number()
                        .min(0, "Protein must be 0 or greater")
                        .optional(),
                    carbohydratesInGrams: z // in grams
                        .number()
                        .min(0, "Carbohydrates must be 0 or greater")
                        .optional(),
                    fatInGrams: z // in grams
                        .number()
                        .min(0, "Fat must be 0 or greater")
                        .optional(),
                    fiberInGrams: z // in grams
                        .number()
                        .min(0, "Fiber must be 0 or greater")
                        .optional(),
                    sugarInGrams: z // in grams
                        .number()
                        .min(0, "Sugar must be 0 or greater")
                        .optional(),
                    sodiumInMilligrams: z // in milligrams
                        .number()
                        .min(0, "Sodium must be 0 or greater")
                        .optional(),
                }),
                source: z
                    .enum([
                        "user_measured",
                        "package_label",
                        "database",
                        "estimated",
                    ])
                    .default("user_measured"),
            })
        )
        .min(1, "Food must have at least one unit")
        .max(20, "Food can have at most 20 units"),
});

export type FoodItemUnitType = z.infer<typeof foodItemUnitSchema>;
