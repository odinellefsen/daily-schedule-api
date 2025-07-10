// Recipe create schema

import { z } from "zod";
import { MealTimingEnum } from "./recipe.shared_utils";

// This schema is used to create a recipe
export const recipeCreateSchema = z.object({
    recipeId: z.string().uuid("The recipe ID must be a valid UUID"),
    whenIsMealEaten: z.nativeEnum(MealTimingEnum),
    nameOfTheFoodRecipe: z
        .string()
        .min(1, "The name of the food recipe is required")
        .max(75, "The name of the food recipe must be less than 75 characters"),
    generalDescriptionOfTheFoodRecipe: z
        .string()
        .min(
            1,
            "If generalDescriptionOfTheFoodRecipe is NOT undefined, you must have at least one character"
        )
        .max(
            250,
            "The general description of the food recipe must be less than 250 characters"
        )
        .optional(),
});
export type RecipeCreateType = z.infer<typeof recipeCreateSchema>;
