import { z } from "zod";

// When a user adds a food item to a recipe/meal with specific quantity and unit
export const foodUsageSchema = z.object({
    usageId: z.string().uuid("Invalid usage ID"),
    foodId: z.string().uuid("Invalid food ID"), // References the food item
    unitId: z.string().uuid("Invalid unit ID"), // Which unit from the food's available units
    quantity: z
        .number()
        .positive("Quantity must be greater than 0")
        .max(1000, "Quantity seems too large"), // e.g., 2 (for "2 medium apples")

    // For context - useful for display and calculations
    displayText: z
        .string()
        .max(100, "Display text must be less than 100 characters")
        .optional(), // e.g., "2 medium apples", "1 cup flour"

    // Calculated nutrition (quantity × unit nutrition)
    totalNutrition: z.object({
        calories: z.number().min(0),
        protein: z.number().min(0).optional(),
        carbohydrates: z.number().min(0).optional(),
        fat: z.number().min(0).optional(),
        fiber: z.number().min(0).optional(),
        sugar: z.number().min(0).optional(),
        sodium: z.number().min(0).optional(),
    }),

    // Optional user notes
    notes: z
        .string()
        .max(200, "Notes must be less than 200 characters")
        .optional(), // e.g., "extra ripe", "organic"
});

export type FoodUsageType = z.infer<typeof foodUsageSchema>;

// Helper schema for calculating nutrition when adding food to recipe
export const foodUsageCalculationSchema = z.object({
    foodId: z.string().uuid(),
    unitId: z.string().uuid(),
    quantity: z.number().positive(),
});

export type FoodUsageCalculationType = z.infer<
    typeof foodUsageCalculationSchema
>;
