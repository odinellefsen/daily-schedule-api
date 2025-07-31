import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { recipeIngredients, recipeSteps, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

export function registerListRecipes(app: Hono) {
    app.get("/", async (c) => {
        const safeUserId = c.userId!;

        const userRecipes = await db
            .select()
            .from(recipes)
            .where(eq(recipes.userId, safeUserId))
            .orderBy(recipes.nameOfTheRecipe);

        // Get step and ingredient counts for each recipe
        const recipesWithMetadata = await Promise.all(
            userRecipes.map(async (recipe) => {
                const steps = await db
                    .select()
                    .from(recipeSteps)
                    .where(eq(recipeSteps.recipeId, recipe.id));

                const ingredients = await db
                    .select()
                    .from(recipeIngredients)
                    .where(eq(recipeIngredients.recipeId, recipe.id));

                return {
                    id: recipe.id,
                    nameOfTheRecipe: recipe.nameOfTheRecipe,
                    generalDescriptionOfTheRecipe:
                        recipe.generalDescriptionOfTheRecipe,
                    whenIsItConsumed: recipe.whenIsItConsumed,
                    version: recipe.version,
                    stepCount: steps.length,
                    ingredientCount: ingredients.length,
                    hasSteps: steps.length > 0,
                    hasIngredients: ingredients.length > 0,
                    completeness:
                        steps.length > 0 && ingredients.length > 0
                            ? "complete"
                            : "incomplete",
                };
            })
        );

        return c.json(
            ApiResponse.success(
                "Recipes retrieved successfully",
                recipesWithMetadata
            )
        );
    });

    app.get("/:recipeId", async (c) => {
        const safeUserId = c.userId!;
        const recipeId = c.req.param("recipeId");

        const recipeFromDb = await db.query.recipes.findFirst({
            where: eq(recipes.id, recipeId),
        });

        if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Recipe not found or access denied"),
                StatusCodes.NOT_FOUND
            );
        }

        // Get recipe steps
        const steps = await db
            .select()
            .from(recipeSteps)
            .where(eq(recipeSteps.recipeId, recipeId))
            .orderBy(recipeSteps.stepNumber);

        // Get recipe ingredients
        const ingredients = await db
            .select()
            .from(recipeIngredients)
            .where(eq(recipeIngredients.recipeId, recipeId))
            .orderBy(recipeIngredients.sortOrder);

        const fullRecipe = {
            id: recipeFromDb.id,
            nameOfTheRecipe: recipeFromDb.nameOfTheRecipe,
            generalDescriptionOfTheRecipe:
                recipeFromDb.generalDescriptionOfTheRecipe,
            whenIsItConsumed: recipeFromDb.whenIsItConsumed,
            version: recipeFromDb.version,
            steps: steps.map((step) => ({
                id: step.id,
                instruction: step.instruction,
                stepNumber: step.stepNumber,
            })),
            ingredients: ingredients.map((ingredient) => ({
                id: ingredient.id,
                ingredientText: ingredient.ingredientText,
                sortOrder: ingredient.sortOrder,
            })),
            metadata: {
                stepCount: steps.length,
                ingredientCount: ingredients.length,
                estimatedTotalTime: null, // Could calculate from step durations
            },
        };

        return c.json(
            ApiResponse.success("Recipe retrieved successfully", fullRecipe)
        );
    });

    app.get("/search", async (c) => {
        const safeUserId = c.userId!;
        const query = c.req.query("q") || "";
        const mealTiming = c.req.query("timing"); // BREAKFAST, LUNCH, etc.

        let userRecipes = await db
            .select()
            .from(recipes)
            .where(eq(recipes.userId, safeUserId))
            .orderBy(recipes.nameOfTheRecipe);

        // Filter by search query
        if (query) {
            userRecipes = userRecipes.filter(
                (recipe) =>
                    recipe.nameOfTheRecipe
                        .toLowerCase()
                        .includes(query.toLowerCase()) ||
                    (recipe.generalDescriptionOfTheRecipe &&
                        recipe.generalDescriptionOfTheRecipe
                            .toLowerCase()
                            .includes(query.toLowerCase()))
            );
        }

        // Filter by meal timing
        if (mealTiming) {
            userRecipes = userRecipes.filter(
                (recipe) =>
                    recipe.whenIsItConsumed &&
                    recipe.whenIsItConsumed.includes(mealTiming)
            );
        }

        return c.json(
            ApiResponse.success("Recipe search results", userRecipes)
        );
    });
}
