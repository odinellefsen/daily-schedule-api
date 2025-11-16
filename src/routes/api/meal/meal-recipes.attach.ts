import { and, eq, inArray } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealRecipeAttachType,
    mealRecipeAttachSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { mealRecipes, meals, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

const requestSchema = z.object({
    recipeIds: z
        .array(z.string().uuid())
        .min(1, "At least one recipe ID is required"),
});

export function registerAttachMealRecipes(app: Hono) {
    // Attach recipe(s) to a meal
    app.post("/:mealId/recipes", async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");

        const rawJsonBody = await c.req.json();

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

        const { recipeIds } = parsedJsonBody.data;

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

        // Verify all recipes exist and belong to user
        const recipesFromDb = await db.query.recipes.findMany({
            where: and(
                inArray(recipes.id, recipeIds),
                eq(recipes.userId, safeUserId),
            ),
        });
        if (recipesFromDb.length !== recipeIds.length) {
            const missingRecipeIds = recipeIds.filter(
                (id) => !recipesFromDb.some((r) => r.id === id),
            );
            return c.json(
                ApiResponse.error(
                    "One or more recipes not found or access denied",
                    `Recipes ${missingRecipeIds.join(", ")} not found or access denied`,
                ),
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

        // Build the recipes array with order
        const recipesToAttach = recipesFromDb.map((recipe, index) => ({
            recipeId: recipe!.id,
            orderInMeal: maxOrder + 1 + index,
        }));

        const newMealRecipe: MealRecipeAttachType = {
            mealId,
            recipes: recipesToAttach,
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
                ApiResponse.error("Failed to attach recipes to meal", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                `${recipeIds.length} recipe${recipeIds.length > 1 ? "s" : ""} attached to meal successfully`,
                {
                    mealRecipe: attachEvent.data,
                },
            ),
            StatusCodes.CREATED,
        );
    });
}
