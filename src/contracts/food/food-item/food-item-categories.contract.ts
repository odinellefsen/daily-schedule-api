import { z } from "zod";

// Flexible hierarchical category system
export const foodCategorySchema = z.object({
    // Array of category levels: ["fruits", "citrus", "oranges"]
    categories: z
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
        .min(1, "Must have at least one category level")
        .max(5, "Maximum 5 category levels allowed"),
});

export type FoodCategoryType = z.infer<typeof foodCategorySchema>;
