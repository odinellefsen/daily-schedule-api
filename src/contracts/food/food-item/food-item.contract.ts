import { z } from "@hono/zod-openapi";

// Food item with multiple possible units, each with their own nutrition
export const foodItemSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    name: z
        .string()
        .min(1, "The name of the food item is required")
        .max(100, "The name of the food item must be less than 100 characters"),
    categoryHierarchy: z
        // this looks like ["fruit", "citrus", "lime"]
        // from highest level to lowest level
        .array(
            z
                .string()
                .min(1, "Category level cannot be empty")
                .max(30, "Category level must be less than 30 characters")
                .regex(
                    /^[a-zA-Z0-9\s\-_]+$/,
                    "Category can only contain letters, numbers, spaces, hyphens, and underscores",
                ),
        )
        .min(
            1,
            "if foodItemCategoryHierarchy is NOT undefined, then you must have atleast 1 string in the array",
        )
        .max(5, "Maximum 5 category levels allowed")
        .optional(),
});

export const foodItemArchivedSchema = z.object({
    foodItemId: z.string().uuid(),
});

export type FoodItemType = z.infer<typeof foodItemSchema>;
export type FoodItemArchivedType = z.infer<typeof foodItemArchivedSchema>;
