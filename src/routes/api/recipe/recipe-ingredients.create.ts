import { eq } from "drizzle-orm";
import z from "zod";
import {
    type RecipeIngredientsType,
    recipeIngredientsSchema,
} from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { recipeIngredients, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import recipe from ".";

// client side request schema
const createRecipeIngredientsRequestSchema = z.object({
    recipeId: z.string().uuid(),
    ingredients: z
        .array(
            z.object({
                ingredientText: z.string().min(1).max(150),
                sortOrder: z.number().positive().int(),
            })
        )
        .min(1)
        .max(50),
});

recipe.post("/ingredients", async (c) => {
    const safeUserId = c.userId!;

    const rawJsonBody = await c.req.json();
    const parsedJsonBody =
        createRecipeIngredientsRequestSchema.safeParse(rawJsonBody);
    if (!parsedJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe ingredients data",
                parsedJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateRecipeIngredientsJsonBody = parsedJsonBody.data;

    // Verify recipe exists and belongs to user
    const recipeFromDb = await db.query.recipes.findFirst({
        where: eq(recipes.id, safeCreateRecipeIngredientsJsonBody.recipeId),
    });

    if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
        return c.json(
            ApiResponse.error("Recipe not found or access denied"),
            StatusCodes.NOT_FOUND
        );
    }

    // Check if ingredients already exist
    const existingIngredients = await db
        .select()
        .from(recipeIngredients)
        .where(
            eq(
                recipeIngredients.recipeId,
                safeCreateRecipeIngredientsJsonBody.recipeId
            )
        );

    if (existingIngredients.length > 0) {
        return c.json(
            ApiResponse.error("Recipe ingredients already exist"),
            StatusCodes.CONFLICT
        );
    }

    const newRecipeIngredients: RecipeIngredientsType = {
        recipeId: safeCreateRecipeIngredientsJsonBody.recipeId,
        ingredients: safeCreateRecipeIngredientsJsonBody.ingredients.map(
            (ingredient) => ({
                id: crypto.randomUUID(),
                ingredientText: ingredient.ingredientText,
                sortOrder: ingredient.sortOrder,
            })
        ),
    };

    const createRecipeIngredientsEvent =
        recipeIngredientsSchema.safeParse(newRecipeIngredients);
    if (!createRecipeIngredientsEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe ingredients data",
                createRecipeIngredientsEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateRecipeIngredientsEvent = createRecipeIngredientsEvent.data;

    try {
        await FlowcorePathways.write(
            "recipe.v0/recipe-ingredients.created.v0",
            {
                data: safeCreateRecipeIngredientsEvent,
            }
        );
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to create recipe ingredients", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success(
            "Recipe ingredients created successfully",
            safeCreateRecipeIngredientsEvent
        )
    );
});

export default recipe;
