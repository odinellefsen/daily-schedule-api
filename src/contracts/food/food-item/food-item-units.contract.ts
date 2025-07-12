import { z } from "zod";
import { UnitOfMeasurementEnum } from "../recipe";

export const foodItemUnitSchema = z.object({
    // Each food can have multiple units with their own nutrition
    foodItemId: z.string().uuid(),
    units: z
        .array(
            z.object({
                unitId: z.string().uuid(),
                unitName: z.nativeEnum(UnitOfMeasurementEnum),
                unitDescription: z
                    .string()
                    .max(
                        100,
                        "Unit description must be less than 100 characters"
                    )
                    .optional(), // e.g., "1 medium apple (about 180g)", "1 thick slice"

                // Nutrition per 1 unit
                nutritionPerUnit: z.object({
                    calories: z
                        .number()
                        .min(0, "Calories must be 0 or greater"),
                    protein: z
                        .number()
                        .min(0, "Protein must be 0 or greater")
                        .optional(), // grams
                    carbohydrates: z
                        .number()
                        .min(0, "Carbohydrates must be 0 or greater")
                        .optional(), // grams
                    fat: z
                        .number()
                        .min(0, "Fat must be 0 or greater")
                        .optional(), // grams
                    fiber: z
                        .number()
                        .min(0, "Fiber must be 0 or greater")
                        .optional(), // grams
                    sugar: z
                        .number()
                        .min(0, "Sugar must be 0 or greater")
                        .optional(), // grams
                    sodium: z
                        .number()
                        .min(0, "Sodium must be 0 or greater")
                        .optional(), // milligrams
                }),

                // Metadata
                isDefault: z.boolean().default(false), // Which unit to show first
                estimatedWeight: z.number().positive().optional(), // grams (for reference)
                source: z
                    .enum([
                        "user_measured",
                        "package_label",
                        "database",
                        "estimated",
                    ])
                    .default("user_measured"),
                notes: z
                    .string()
                    .max(200, "Notes must be less than 200 characters")
                    .optional(),
            })
        )
        .min(1, "Food must have at least one unit")
        .max(20, "Food can have at most 20 units"),
});

export type FoodItemUnitType = z.infer<typeof foodItemUnitSchema>;
