import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { mealRecipes, meals, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

export function registerListMealRecipes(app: Hono) {
    // List recipes in a meal
    app.get("/:mealId/recipes", async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");

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

        // Get all recipes for this meal
        const mealRecipesData = await db
            .select()
            .from(mealRecipes)
            .where(eq(mealRecipes.mealId, mealId))
            .orderBy(mealRecipes.orderInMeal);

        // Enrich with recipe details
        const enrichedRecipes = await Promise.all(
            mealRecipesData.map(async (mr) => {
                const recipe = await db.query.recipes.findFirst({
                    where: eq(recipes.id, mr.recipeId),
                });

                return {
                    mealRecipeId: mr.id,
                    recipeId: mr.recipeId,
                    recipeName: recipe?.nameOfTheRecipe || "Unknown Recipe",
                    recipeDescription:
                        recipe?.generalDescriptionOfTheRecipe || "",
                    recipeVersion: mr.recipeVersion,
                    currentVersion: recipe?.version || 0,
                    isOutdated: recipe
                        ? mr.recipeVersion < recipe.version
                        : false,
                    orderInMeal: mr.orderInMeal,
                };
            }),
        );

        return c.json(
            ApiResponse.success("Meal recipes retrieved successfully", {
                mealId,
                recipes: enrichedRecipes,
            }),
        );
    });
}
