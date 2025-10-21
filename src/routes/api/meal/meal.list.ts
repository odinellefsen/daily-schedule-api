import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { mealRecipes, meals, recipeInstructions } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

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

    app.get("/:mealId", async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");

        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, mealId),
        });

        if (!mealFromDb || mealFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Meal not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        // Get all recipes attached to this meal
        const mealRecipesData = await db
            .select()
            .from(mealRecipes)
            .where(eq(mealRecipes.mealId, mealId))
            .orderBy(mealRecipes.orderInMeal);

        // Fetch all instructions for all recipes in this meal
        const allInstructions = [];
        for (const mealRecipe of mealRecipesData) {
            const instructions = await db
                .select()
                .from(recipeInstructions)
                .where(eq(recipeInstructions.recipeId, mealRecipe.recipeId))
                .orderBy(recipeInstructions.instructionNumber);

            for (const inst of instructions) {
                allInstructions.push({
                    id: inst.id,
                    recipeId: mealRecipe.recipeId,
                    instruction: inst.instruction,
                    instructionNumber: inst.instructionNumber,
                });
            }
        }

        const fullMeal = {
            id: mealFromDb.id,
            mealName: mealFromDb.mealName,
            recipes: mealRecipesData.map((mr) => ({
                mealRecipeId: mr.id,
                recipeId: mr.recipeId,
                recipeVersion: mr.recipeVersion,
                orderInMeal: mr.orderInMeal,
            })),
            instructions: allInstructions,
            instructionCount: allInstructions.length,
        };

        return c.json(
            ApiResponse.success("Meal retrieved successfully", fullMeal),
        );
    });
}
