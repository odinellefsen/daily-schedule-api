import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import {
    type MealRecipeDetachType,
    mealRecipeDetachSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { mealRecipes, meals } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

export function registerDetachMealRecipes(app: Hono) {
    // Detach a recipe from a meal
    app.delete("/:mealId/recipes/:mealRecipeId", async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");
        const mealRecipeId = c.req.param("mealRecipeId");

        // Verify meal exists and belongs to user
        const mealFromDb = await db.query.meals.findFirst({
            where: and(eq(meals.id, mealId), eq(meals.userId, safeUserId)),
        });

        if (!mealFromDb) {
            return c.json(
                ApiResponse.error("Meal not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        // Verify meal-recipe association exists
        const mealRecipeFromDb = await db.query.mealRecipes.findFirst({
            where: and(
                eq(mealRecipes.id, mealRecipeId),
                eq(mealRecipes.mealId, mealId),
            ),
        });

        if (!mealRecipeFromDb) {
            return c.json(
                ApiResponse.error("Recipe not found in this meal"),
                StatusCodes.NOT_FOUND,
            );
        }

        const detachData: MealRecipeDetachType = {
            mealRecipeId,
        };

        const detachEvent = mealRecipeDetachSchema.safeParse(detachData);
        if (!detachEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid detach data",
                    detachEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        try {
            await FlowcorePathways.write("meal.v0/meal-recipe.detached.v0", {
                data: detachEvent.data,
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to detach recipe from meal", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success("Recipe detached from meal successfully"),
        );
    });
}
