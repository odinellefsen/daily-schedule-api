import { z } from "zod";

export enum whatTriggeredVersionUpate {
    recipeBase = "recipeBase",
    recipeIngredients = "recipeIngredients",
    recipeInstructions = "recipeInstructions",
}

export const recipeVersionSchema = z.object({
    recipeId: z.string().uuid(),
    version: z.number().int().positive(),
    whatTriggeredUpdate: z.nativeEnum(whatTriggeredVersionUpate),
});

export type RecipeVersionType = z.infer<typeof recipeVersionSchema>;
