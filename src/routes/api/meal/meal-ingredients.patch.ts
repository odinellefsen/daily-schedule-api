import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealIngredientsUpdateType,
    mealIngredientsUpdateSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { mealIngredients, meals } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const updateMealIngredientsRequestSchema = z.object({
    mealId: z.string().uuid(),
    ingredients: z
        .array(
            z.object({
                id: z.string().uuid(),
                ingredientText: z.string().min(1).max(150),
                sortOrder: z.number().positive().int(),
            })
        )
        .min(1)
        .max(100),
});

export function registerPatchMealIngredients(app: Hono) {
    app.patch("/ingredients", async (c) => {
        const safeUserId = c.userId!;

        const rawRequestJsonBody = await c.req.json();
        const parsedRequestJsonBody =
            updateMealIngredientsRequestSchema.safeParse(rawRequestJsonBody);
        if (!parsedRequestJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal ingredients data",
                    parsedRequestJsonBody.error.errors
                ),
                StatusCodes.BAD_REQUEST
            );
        }
        const safeUpdateMealIngredientsRequestBody = parsedRequestJsonBody.data;

        // Verify meal exists and belongs to user
        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, safeUpdateMealIngredientsRequestBody.mealId),
        });

        if (!mealFromDb || mealFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Meal not found or access denied"),
                StatusCodes.NOT_FOUND
            );
        }

        // Get existing ingredients (assuming a mealIngredients table exists)
        // For now, build oldValues from current request since we don't have the table yet
        const oldIngredients = {
            mealId: safeUpdateMealIngredientsRequestBody.mealId,
            ingredients: [], // Would fetch from DB in real implementation
        };

        const updatedMealIngredients: MealIngredientsUpdateType = {
            mealId: safeUpdateMealIngredientsRequestBody.mealId,
            ingredients: safeUpdateMealIngredientsRequestBody.ingredients.map(
                (ingredient) => ({
                    id: ingredient.id,
                    recipeId: "", // Would need to preserve from existing data
                    ingredientText: ingredient.ingredientText,
                    sortOrder: ingredient.sortOrder,
                })
            ),
            oldValues: oldIngredients,
        };

        const updateMealIngredientsEvent =
            mealIngredientsUpdateSchema.safeParse(updatedMealIngredients);
        if (!updateMealIngredientsEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal ingredients data",
                    updateMealIngredientsEvent.error.errors
                ),
                StatusCodes.BAD_REQUEST
            );
        }
        const safeUpdateMealIngredientsEvent = updateMealIngredientsEvent.data;

        try {
            await FlowcorePathways.write(
                "meal.v0/meal-ingredients.updated.v0",
                {
                    data: safeUpdateMealIngredientsEvent,
                }
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to update meal ingredients", error),
                StatusCodes.SERVER_ERROR
            );
        }

        return c.json(
            ApiResponse.success(
                "Meal ingredients updated successfully",
                safeUpdateMealIngredientsEvent
            )
        );
    });
}
