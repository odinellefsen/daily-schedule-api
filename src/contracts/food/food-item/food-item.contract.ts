import { z } from "zod";

// Food item with multiple possible units, each with their own nutrition
export const foodItemSchema = z.object({
    foodId: z.string().uuid("Invalid food ID"),
    userId: z.string().uuid("Invalid user ID"), // User owns their food definitions
    name: z
        .string()
        .min(1, "Food name is required")
        .max(100, "Food name must be less than 100 characters"),
    category: z
        .string()
        .min(1, "Category is required")
        .max(50, "Category must be less than 50 characters")
        .optional(), // e.g., "fruits", "grains", "proteins", "dairy"
    description: z
        .string()
        .max(250, "Description must be less than 250 characters")
        .optional(),

    // Each food can have multiple units with their own nutrition
    units: z
        .array(
            z.object({
                unitId: z.string().uuid("Invalid unit ID"),
                unitName: z
                    .string()
                    .min(1, "Unit name is required")
                    .max(50, "Unit name must be less than 50 characters"), // e.g., "medium", "slice", "cup", "100g"
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

    // Sharing options
    isPublic: z.boolean().default(false), // Allow others to use this food definition

    // Timestamps
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export type FoodItemType = z.infer<typeof foodItemSchema>;
export type FoodUnitType = FoodItemType["units"][number];
