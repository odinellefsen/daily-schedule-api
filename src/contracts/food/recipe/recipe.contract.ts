import { z } from "@hono/zod-openapi";
import { MealTimingEnum } from "./recipe.shared_utils";

export const recipeSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    whenIsItConsumed: z.array(z.nativeEnum(MealTimingEnum)).optional(),
    nameOfTheRecipe: z
        .string()
        .min(1, "The name of the recipe is required")
        .max(75, "The name of the recipe must be less than 75 characters"),
    generalDescriptionOfTheRecipe: z
        .string()
        .min(
            1,
            "If generalDescriptionOfTheRecipe is NOT undefined, you must have at least one character",
        )
        .max(
            250,
            "The general description of the recipe must be less than 250 characters",
        )
        .optional(),
});

export const recipeUpdateSchema = recipeSchema.extend({
    oldValues: recipeSchema,
});

export const recipeArchiveSchema = z.object({
    recipeId: z.string().uuid(),
});

export type RecipeMetadataType = z.infer<typeof recipeSchema>;
export type RecipeUpdateType = z.infer<typeof recipeUpdateSchema>;
export type RecipeArchiveType = z.infer<typeof recipeArchiveSchema>;
