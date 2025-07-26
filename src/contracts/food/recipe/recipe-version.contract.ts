import { z } from "zod";

export const recipeVersionSchema = z.object({
    recipeId: z.string().uuid(),
    version: z.number().int().positive(),
});

export type RecipeVersionType = z.infer<typeof recipeVersionSchema>;
