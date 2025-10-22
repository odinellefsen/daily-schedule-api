import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { mealRecipes, meals } from "../../../db/schemas";
import { ApiResponse } from "../../../utils/api-responses";

export function registerListMeals(app: Hono) {
    app.get("/", async (c) => {
        const safeUserId = c.userId!;

        const userMeals = await db
            .select()
            .from(meals)
            .where(eq(meals.userId, safeUserId));

        const mealsData = await Promise.all(
            userMeals.map(async (meal) => {
                // Get recipes attached to this meal
                const mealRecipesData = await db
                    .select()
                    .from(mealRecipes)
                    .where(eq(mealRecipes.mealId, meal.id))
                    .orderBy(mealRecipes.orderInMeal);

                return {
                    id: meal.id,
                    mealName: meal.mealName,
                    recipeCount: mealRecipesData.length,
                };
            }),
        );

        return c.json(
            ApiResponse.success("Meals retrieved successfully", mealsData),
        );
    });
}
