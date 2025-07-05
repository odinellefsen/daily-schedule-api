import { z } from "zod";

export const foodRecipeEventSchema = z.object({
    id: z.string(),
    nameOfFoodRecipe: z.string(),
    ingredients: z.array(
        z.object({
            ingredientName: z.string(),
            ingredientQuantity: z.string(),
            unitOfMeasurement: z.enum(["grams"]),
        })
    ),
});
