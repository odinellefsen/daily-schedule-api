import { z } from "zod";
import { MealTimingEnum } from "./recipe.shared_utils";

// This schema is used to create and update a recipe for foods and drinks
export const recipeSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    whenIsItConsumed: z.array(z.nativeEnum(MealTimingEnum)).optional(),
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

export const recipeUpdateSchema = recipeSchema.extend({
    oldValues: recipeSchema,
});

export const recipeArchiveSchema = recipeSchema.extend({
    reasonForArchiving: z.string().min(1, "Reason for archiving is required"),
});

export type RecipeMetadataType = z.infer<typeof recipeSchema>;
export type RecipeUpdateType = z.infer<typeof recipeUpdateSchema>;
export type RecipeArchiveType = z.infer<typeof recipeArchiveSchema>;
