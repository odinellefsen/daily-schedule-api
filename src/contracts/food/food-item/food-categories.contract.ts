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

    // Optional: Full category path as string for display/search
    categoryPath: z.string().optional(), // Auto-generated: "fruits/citrus/oranges"

    // Primary category (first level) for quick filtering
    primaryCategory: z.string().optional(), // Auto-generated: "fruits"
});

export type FoodCategoryType = z.infer<typeof foodCategorySchema>;

// Common category hierarchies for reference
export const commonFoodCategories = [
    // Fruits
    ["fruits"],
    ["fruits", "citrus"],
    ["fruits", "citrus", "oranges"],
    ["fruits", "citrus", "lemons"],
    ["fruits", "berries"],
    ["fruits", "berries", "strawberries"],
    ["fruits", "tropical"],
    ["fruits", "tree_fruits"],
    ["fruits", "tree_fruits", "apples"],

    // Vegetables
    ["vegetables"],
    ["vegetables", "leafy_greens"],
    ["vegetables", "leafy_greens", "spinach"],
    ["vegetables", "leafy_greens", "lettuce"],
    ["vegetables", "root_vegetables"],
    ["vegetables", "root_vegetables", "carrots"],
    ["vegetables", "cruciferous"],
    ["vegetables", "cruciferous", "broccoli"],

    // Proteins
    ["proteins"],
    ["proteins", "meat"],
    ["proteins", "meat", "beef"],
    ["proteins", "meat", "pork"],
    ["proteins", "meat", "lamb"],
    ["proteins", "poultry"],
    ["proteins", "poultry", "chicken"],
    ["proteins", "poultry", "turkey"],
    ["proteins", "seafood"],
    ["proteins", "seafood", "fish"],
    ["proteins", "seafood", "shellfish"],
    ["proteins", "plant_based"],
    ["proteins", "plant_based", "legumes"],
    ["proteins", "plant_based", "tofu"],

    // Grains
    ["grains"],
    ["grains", "whole_grains"],
    ["grains", "whole_grains", "quinoa"],
    ["grains", "whole_grains", "brown_rice"],
    ["grains", "refined_grains"],
    ["grains", "refined_grains", "white_rice"],
    ["grains", "bread"],
    ["grains", "pasta"],

    // Dairy
    ["dairy"],
    ["dairy", "milk"],
    ["dairy", "cheese"],
    ["dairy", "yogurt"],
    ["dairy", "alternatives"],
    ["dairy", "alternatives", "plant_milk"],

    // Fats & Oils
    ["fats_oils"],
    ["fats_oils", "cooking_oils"],
    ["fats_oils", "nuts_seeds"],
    ["fats_oils", "nuts_seeds", "nuts"],
    ["fats_oils", "nuts_seeds", "seeds"],

    // Beverages
    ["beverages"],
    ["beverages", "alcoholic"],
    ["beverages", "non_alcoholic"],
    ["beverages", "hot_drinks"],
    ["beverages", "cold_drinks"],

    // Snacks & Sweets
    ["snacks"],
    ["snacks", "sweet"],
    ["snacks", "savory"],
    ["sweets"],
    ["sweets", "candy"],
    ["sweets", "baked_goods"],

    // Condiments & Seasonings
    ["condiments"],
    ["seasonings"],
    ["seasonings", "herbs"],
    ["seasonings", "spices"],
] as const;

// Helper functions for category operations
export const categoryHelpers = {
    // Convert array to path string
    toPath: (categories: string[]): string => categories.join("/"),

    // Convert path string to array
    fromPath: (path: string): string[] => path.split("/").filter(Boolean),

    // Get primary category (first level)
    getPrimary: (categories: string[]): string => categories[0] || "",

    // Check if category matches at any level
    matchesAtLevel: (
        categories: string[],
        search: string,
        level: number
    ): boolean => {
        return (
            categories[level]?.toLowerCase().includes(search.toLowerCase()) ||
            false
        );
    },

    // Get all parent categories
    getParents: (categories: string[]): string[][] => {
        const parents: string[][] = [];
        for (let i = 1; i <= categories.length; i++) {
            parents.push(categories.slice(0, i));
        }
        return parents;
    },

    // Check if one category is a parent of another
    isParentOf: (parent: string[], child: string[]): boolean => {
        if (parent.length >= child.length) return false;
        return parent.every((cat, index) => cat === child[index]);
    },
};
