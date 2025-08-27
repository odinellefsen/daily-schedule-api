import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealIngredientsType,
    mealIngredientsSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { meals, recipeIngredients } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const createMealIngredientsRequestSchema = z.object({
    mealId: z.string().uuid(),
    ingredients: z.array(
        z.object({
            id: z.string().uuid(),
            ingredientText: z
                .string()
                .min(1, "Ingredient text is required")
                .max(150, "Ingredient text must be less than 150 characters"),
        }),
    ),
});

export function registerCreateMealIngredients(app: Hono) {
    app.post("/ingredients", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsedJsonBody =
            createMealIngredientsRequestSchema.safeParse(rawJsonBody);
        if (!parsedJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal ingredients data",
                    parsedJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeCreateMealIngredientsJsonBody = parsedJsonBody.data;

        // Verify meal exists and belongs to user
        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, safeCreateMealIngredientsJsonBody.mealId),
        });

        if (!mealFromDb || mealFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Meal not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        // Generate meal ingredients from recipe instances
        const recipes = JSON.parse(mealFromDb.recipes);
        const allIngredients = [];

        for (const recipeInstance of recipes) {
            // Get recipe ingredients for this recipe
            const ingredients = await db
                .select()
                .from(recipeIngredients)
                .where(eq(recipeIngredients.recipeId, recipeInstance.recipeId));

            for (const ingredient of ingredients) {
                allIngredients.push({
                    id: crypto.randomUUID(),
                    recipeId: recipeInstance.recipeId,
                    ingredientText: ingredient.ingredientText,
                });
            }
        }

        const newMealIngredients: MealIngredientsType = {
            mealId: safeCreateMealIngredientsJsonBody.mealId,
            ingredients: allIngredients,
        };

        const createMealIngredientsEvent =
            mealIngredientsSchema.safeParse(newMealIngredients);
        if (!createMealIngredientsEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal ingredients data",
                    createMealIngredientsEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeCreateMealIngredientsEvent = createMealIngredientsEvent.data;

        try {
            await FlowcorePathways.write(
                "meal.v0/meal-ingredients.created.v0",
                {
                    data: safeCreateMealIngredientsEvent,
                },
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to create meal ingredients", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Meal ingredients created successfully",
                safeCreateMealIngredientsEvent,
            ),
        );
    });
}
