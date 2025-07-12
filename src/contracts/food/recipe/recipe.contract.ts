// Recipe create schema

import { z } from "zod";
import { MealTimingEnum } from "./recipe.shared_utils";

// This schema is used to create and update a recipe for foods and drinks
export const recipeMetadataSchema = z.object({
    recipeId: z.string().uuid(),
    userId: z.string().uuid(),
    whenIsItConsumed: z.nativeEnum(MealTimingEnum),
    nameOfTheRecipe: z
        .string()
        .min(1, "The name of the recipe is required")
        .max(75, "The name of the recipe must be less than 75 characters"),
    generalDescriptionOfTheRecipe: z
        .string()
        .min(
            1,
            "If generalDescriptionOfTheRecipe is NOT undefined, you must have at least one character"
        )
        .max(
            250,
            "The general description of the recipe must be less than 250 characters"
        )
        .optional(),
});
export type RecipeCreateType = z.infer<typeof recipeMetadataSchema>;
