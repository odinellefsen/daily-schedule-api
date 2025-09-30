import { eq, inArray } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import {
    foodItems,
    foodItemUnits,
    recipeIngredients,
    recipeInstructionFoodItemUnits,
    recipeInstructions,
    recipes,
} from "../../../db/schemas";
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
                    .from(recipeInstructions)
                    .where(eq(recipeInstructions.recipeId, recipe.id));

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
            }),
        );

        return c.json(
            ApiResponse.success(
                "Recipes retrieved successfully",
                recipesWithMetadata,
            ),
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
                StatusCodes.NOT_FOUND,
            );
        }

        // Get recipe steps
        const instructions = await db
            .select()
            .from(recipeInstructions)
            .where(eq(recipeInstructions.recipeId, recipeId))
            .orderBy(recipeInstructions.instructionNumber);

        // Get instruction food item units

        const instructionFoodItemUnits = await db
            .select()
            .from(recipeInstructionFoodItemUnits)
            .where(
                inArray(
                    recipeInstructionFoodItemUnits.recipeInstructionId,
                    instructions.map((instruction) => instruction.id),
                ),
            );

        // get food item units

        const foodItemUnitsFromDb = await db
            .select()
            .from(foodItemUnits)
            .where(
                inArray(
                    foodItemUnits.id,
                    instructionFoodItemUnits.map(
                        (instructionFoodItemUnit) =>
                            instructionFoodItemUnit.foodItemUnitId,
                    ),
                ),
            );

        const foodItemsFromDb = await db
            .select()
            .from(foodItems)
            .where(
                inArray(
                    foodItems.id,
                    foodItemUnitsFromDb.map(
                        (foodItemUnit) => foodItemUnit.foodItemId,
                    ),
                ),
            );

        // Get recipe ingredients
        const ingredients = await db
            .select()
            .from(recipeIngredients)
            .where(eq(recipeIngredients.recipeId, recipeId));

        const fullRecipe = {
            id: recipeFromDb.id,
            nameOfTheRecipe: recipeFromDb.nameOfTheRecipe,
            generalDescriptionOfTheRecipe:
                recipeFromDb.generalDescriptionOfTheRecipe,
            whenIsItConsumed: recipeFromDb.whenIsItConsumed,
            version: recipeFromDb.version,
            instructions: instructions.map((instruction) => {
                // Find food item units for this instruction
                const instructionFoodUnits = instructionFoodItemUnits
                    .filter(
                        (ifiu) => ifiu.recipeInstructionId === instruction.id,
                    )
                    .map((ifiu) => {
                        // Find the corresponding food item unit
                        const foodItemUnit = foodItemUnitsFromDb.find(
                            (fiu) => fiu.id === ifiu.foodItemUnitId,
                        );
                        // Find the corresponding food item
                        const foodItem = foodItemsFromDb.find(
                            (fi) => fi.id === foodItemUnit?.foodItemId,
                        );

                        return {
                            quantity: ifiu.quantity,
                            calories: foodItemUnit?.calories || 0,
                            unitOfMeasurement:
                                foodItemUnit?.unitOfMeasurement || "",
                            foodItemName: foodItem?.name || "",
                        };
                    });

                return {
                    id: instruction.id,
                    instruction: instruction.instruction,
                    instructionNumber: instruction.instructionNumber,
                    foodItemUnits: instructionFoodUnits,
                };
            }),
            ingredients: ingredients.map((ingredient) => ({
                id: ingredient.id,
                ingredientText: ingredient.ingredientText,
            })),
            metadata: {
                stepCount: instructions.length,
                ingredientCount: ingredients.length,
                estimatedTotalTime: null, // Could calculate from step durations
            },
        };

        return c.json(
            ApiResponse.success("Recipe retrieved successfully", fullRecipe),
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
                    (recipe.generalDescriptionOfTheRecipe
                        ? recipe.generalDescriptionOfTheRecipe
                              .toLowerCase()
                              .includes(query.toLowerCase())
                        : false),
            );
        }

        // Filter by meal timing
        if (mealTiming) {
            userRecipes = userRecipes.filter((recipe) =>
                recipe.whenIsItConsumed
                    ? recipe.whenIsItConsumed.includes(mealTiming)
                    : false,
            );
        }

        return c.json(
            ApiResponse.success("Recipe search results", userRecipes),
        );
    });
}
