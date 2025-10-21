import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealRecipeAttachType,
    type MealRecipeDetachType,
    mealRecipeAttachSchema,
    mealRecipeDetachSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { mealRecipes, meals, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

export function registerMealRecipes(app: Hono) {
    // Attach a recipe to a meal
    app.post("/:mealId/recipes", async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");

        const rawJsonBody = await c.req.json();
        const requestSchema = z.object({
            recipeId: z.string().uuid(),
        });

        const parsedJsonBody = requestSchema.safeParse(rawJsonBody);
        if (!parsedJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid recipe data",
                    parsedJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        const { recipeId } = parsedJsonBody.data;

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

        // Verify recipe exists and belongs to user
        const recipeFromDb = await db.query.recipes.findFirst({
            where: and(
                eq(recipes.id, recipeId),
                eq(recipes.userId, safeUserId),
            ),
        });

        if (!recipeFromDb) {
            return c.json(
                ApiResponse.error("Recipe not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        // Get current max order
        const existingRecipes = await db
            .select()
            .from(mealRecipes)
            .where(eq(mealRecipes.mealId, mealId));

        const maxOrder =
            existingRecipes.length > 0
                ? Math.max(...existingRecipes.map((r) => r.orderInMeal))
                : -1;

        const newMealRecipe: MealRecipeAttachType = {
            mealId,
            recipeId,
            recipeVersion: recipeFromDb.version,
            orderInMeal: maxOrder + 1,
        };

        const attachEvent = mealRecipeAttachSchema.safeParse(newMealRecipe);
        if (!attachEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal recipe data",
                    attachEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        try {
            await FlowcorePathways.write("meal.v0/meal-recipe.attached.v0", {
                data: attachEvent.data,
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to attach recipe to meal", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success("Recipe attached to meal successfully", {
                mealRecipe: attachEvent.data,
            }),
            StatusCodes.CREATED,
        );
    });

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
                    addedAt: mr.addedAt.toISOString(),
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
