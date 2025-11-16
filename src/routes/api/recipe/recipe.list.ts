import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import {
    foodItems,
    foodItemUnits,
    recipeIngredients,
    recipeInstructionFoodItemUnits,
    recipeInstructions,
    recipes,
} from "../../../db/schemas";

// Response schemas
const recipeMetadataSchema = z.object({
    id: z.string().uuid(),
    nameOfTheRecipe: z.string(),
    generalDescriptionOfTheRecipe: z.string().nullable(),
    whenIsItConsumed: z.array(z.string()).nullable(),
    version: z.number(),
    stepCount: z.number(),
    ingredientCount: z.number(),
    hasSteps: z.boolean(),
    hasIngredients: z.boolean(),
    completeness: z.enum(["complete", "incomplete"]),
});

const fullRecipeSchema = z.object({
    id: z.string().uuid(),
    nameOfTheRecipe: z.string(),
    generalDescriptionOfTheRecipe: z.string().nullable(),
    whenIsItConsumed: z.array(z.string()).nullable(),
    version: z.number(),
    instructions: z.array(
        z.object({
            id: z.string().uuid(),
            instruction: z.string(),
            instructionNumber: z.number(),
            foodItemUnits: z.array(
                z.object({
                    quantity: z.number(),
                    calories: z.number(),
                    unitOfMeasurement: z.string(),
                    foodItemName: z.string(),
                }),
            ),
        }),
    ),
    ingredients: z.array(
        z.object({
            id: z.string().uuid(),
            ingredientText: z.string(),
        }),
    ),
    metadata: z.object({
        stepCount: z.number(),
        ingredientCount: z.number(),
        estimatedTotalTime: z.number().nullable(),
    }),
});

const recipeBasicSchema = z.object({
    id: z.string().uuid(),
    nameOfTheRecipe: z.string(),
    generalDescriptionOfTheRecipe: z.string().nullable(),
    whenIsItConsumed: z.array(z.string()).nullable(),
});

// Route definitions
const listRecipesRoute = createRoute({
    method: "get",
    path: "/api/recipe",
    tags: ["Recipes"],
    security: [{ Bearer: [] }],
    responses: {
        200: {
            description: "Recipes retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: z.array(recipeMetadataSchema),
                    }),
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                    }),
                },
            },
        },
    },
});

const getRecipeByIdRoute = createRoute({
    method: "get",
    path: "/api/recipe/{recipeId}",
    tags: ["Recipes"],
    security: [{ Bearer: [] }],
    request: {
        params: z.object({
            recipeId: z.string().uuid(),
        }),
    },
    responses: {
        200: {
            description: "Recipe retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: fullRecipeSchema,
                    }),
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                    }),
                },
            },
        },
        404: {
            description: "Recipe not found or access denied",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                    }),
                },
            },
        },
    },
});

const searchRecipesRoute = createRoute({
    method: "get",
    path: "/api/recipe/search",
    tags: ["Recipes"],
    security: [{ Bearer: [] }],
    request: {
        query: z.object({
            q: z.string().optional(),
            timing: z.string().optional(),
        }),
    },
    responses: {
        200: {
            description: "Recipe search results",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: z.array(recipeBasicSchema),
                    }),
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                    }),
                },
            },
        },
    },
});

export function registerListRecipes(app: OpenAPIHono) {
    app.openapi(listRecipesRoute, async (c) => {
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
                            ? ("complete" as const)
                            : ("incomplete" as const),
                };
            }),
        );

        return c.json(
            {
                success: true as const,
                message: "Recipes retrieved successfully",
                data: recipesWithMetadata,
            },
            200,
        );
    });

    app.openapi(getRecipeByIdRoute, async (c) => {
        const safeUserId = c.userId!;
        const recipeId = c.req.param("recipeId");

        const recipeFromDb = await db.query.recipes.findFirst({
            where: eq(recipes.id, recipeId),
        });

        if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
            return c.json(
                {
                    success: false as const,
                    message: "Recipe not found or access denied",
                },
                404,
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
            {
                success: true as const,
                message: "Recipe retrieved successfully",
                data: fullRecipe,
            },
            200,
        );
    });

    app.openapi(searchRecipesRoute, async (c) => {
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
            {
                success: true as const,
                message: "Recipe search results",
                data: userRecipes,
            },
            200,
        );
    });
}
