import { z } from "zod";
import { foodCategorySchema } from "./food-item-categories.contract";

// Food item with multiple possible units, each with their own nutrition
export const foodItemSchema = z.object({
    foodItemId: z.string().uuid(),
    userId: z.string().uuid(), // User owns their food definitions
    nameOfTheFoodItem: z
        .string()
        .min(1, "The name of the food item is required")
        .max(100, "The name of the food item must be less than 100 characters"),
    // New hierarchical category system
    category: foodCategorySchema.optional(),
    description: z
        .string()
        .max(250, "Description must be less than 250 characters")
        .optional(),
});

export type FoodItemType = z.infer<typeof foodItemSchema>;
