// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import {
    mealRecipes,
    meals,
    recipeIngredients,
    recipeInstructions,
} from "../../../db/schemas";

const mealsTag = "Meals";
const httpGetMethod = "get";
const getMealPath = "/api/meal/{mealId}";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusUnauthorized = 401;
const httpStatusNotFound = 404;
const mealRetrievedSuccessMessage = "Meal retrieved successfully";
const mealNotFoundOrDeniedMessage = "Meal not found or access denied";
const unauthorizedResponseDescription = "Unauthorized";

// Response schemas
const fullMealSchema = z.object({
    id: z.string().uuid(),
    mealName: z.string(),
    recipes: z.array(
        z.object({
            recipeId: z.string().uuid(),
            orderInMeal: z.number(),
        }),
    ),
    instructions: z.array(
        z.object({
            recipeId: z.string().uuid(),
            instruction: z.string(),
            instructionNumber: z.number(),
        }),
    ),
    ingredients: z.array(
        z.object({
            recipeId: z.string().uuid(),
            ingredientText: z.string(),
        }),
    ),
});

// Route definition
const getMealRoute = createRoute({
    method: httpGetMethod,
    path: getMealPath,
    tags: [mealsTag],
    security: [{ Bearer: [] }],
    request: {
        params: z.object({
            mealId: z.string().uuid(),
        }),
    },
    responses: {
        [httpStatusOk]: {
            description: mealRetrievedSuccessMessage,
            content: {
                [jsonContentType]: {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: fullMealSchema,
                    }),
                },
            },
        },
        [httpStatusUnauthorized]: {
            description: unauthorizedResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                    }),
                },
            },
        },
        [httpStatusNotFound]: {
            description: mealNotFoundOrDeniedMessage,
            content: {
                [jsonContentType]: {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                    }),
                },
            },
        },
    },
});

export function registerGetMeal(app: OpenAPIHono) {
    app.openapi(getMealRoute, async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");

        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, mealId),
        });

        if (!mealFromDb || mealFromDb.userId !== safeUserId) {
            return c.json(
                {
                    success: false as const,
                    message: mealNotFoundOrDeniedMessage,
                },
                httpStatusNotFound,
            );
        }

        // Get all recipes attached to this meal
        const mealRecipesData = await db
            .select()
            .from(mealRecipes)
            .where(eq(mealRecipes.mealId, mealId))
            .orderBy(mealRecipes.orderInMeal);

        // Fetch all instructions for all recipes in this meal
        const allIngredients = [];
        const allInstructions = [];
        for (const mealRecipe of mealRecipesData) {
            const ingredients = await db
                .select()
                .from(recipeIngredients)
                .where(eq(recipeIngredients.recipeId, mealRecipe.recipeId))
                .orderBy(recipeIngredients.ingredientText);

            for (const ingredient of ingredients) {
                allIngredients.push({
                    recipeId: mealRecipe.recipeId,
                    ingredientText: ingredient.ingredientText,
                });
            }

            const instructions = await db
                .select()
                .from(recipeInstructions)
                .where(eq(recipeInstructions.recipeId, mealRecipe.recipeId))
                .orderBy(recipeInstructions.instructionNumber);

            for (const inst of instructions) {
                allInstructions.push({
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
                recipeId: mr.recipeId,
                orderInMeal: mr.orderInMeal,
            })),
            instructions: allInstructions,
            ingredients: allIngredients,
        };

        return c.json(
            {
                success: true as const,
                message: mealRetrievedSuccessMessage,
                data: fullMeal,
            },
            httpStatusOk,
        );
    });
}
