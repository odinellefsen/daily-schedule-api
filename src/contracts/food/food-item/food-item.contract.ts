import { z } from "zod";

// Food item with multiple possible units, each with their own nutrition
export const foodItemSchema = z.object({
    foodItemId: z.string().uuid(),
    userId: z.string().uuid(),
    name: z
        .string()
        .min(1, "The name of the food item is required")
        .max(100, "The name of the food item must be less than 100 characters"),
    categoryHierarchy: z
        // this looks like ["fruit", "citrus", "lime"]
        .array(
            z
                .string()
                .min(1, "Category level cannot be empty")
                .max(30, "Category level must be less than 30 characters")
                .regex(
                    /^[a-zA-Z0-9\s\-_]+$/,
                    "Category can only contain letters, numbers, spaces, hyphens, and underscores"
                )
        )
        .min(
            1,
            "if foodItemCategoryHierarchy is NOT undefined, then you must have atleast 1 string in the array"
        )
        .max(5, "Maximum 5 category levels allowed")
        .optional(),
});

export const foodItemUpdatedSchema = foodItemSchema.extend({
    oldValues: foodItemSchema,
});

export type FoodItemType = z.infer<typeof foodItemSchema>;
export type FoodItemUpdatedType = z.infer<typeof foodItemUpdatedSchema>;
