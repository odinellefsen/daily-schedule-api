// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq, inArray } from "drizzle-orm";
import {
    type MealRecipeAttachType,
    mealRecipeAttachSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { mealRecipes, meals, recipes } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const mealsTag = "Meals";
const httpPostMethod = "post";
const attachMealRecipesPath = "/api/meal/{mealId}/recipes";
const jsonContentType = "application/json";
const httpStatusCreated = 201;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusNotFound = 404;
const httpStatusInternalServerError = 500;
const recipesAttachedSuccessDescription =
    "Recipes attached to meal successfully";
const mealNotFoundOrDeniedMessage = "Meal not found or access denied";
const recipesNotFoundOrDeniedMessage =
    "One or more recipes not found or access denied";
const invalidMealRecipeDataMessage = "Invalid meal recipe data";
const failedToAttachRecipesMessage = "Failed to attach recipes to meal";
const mealRecipeAttachedEventType = "meal.v0/meal-recipe.attached.v0";
const badRequestResponseDescription = "Bad Request";
const unauthorizedResponseDescription = "Unauthorized";
const mealOrRecipesNotFoundDescription = "Meal or recipes not found";
const internalServerErrorResponseDescription = "Internal Server Error";

// Request schema
const requestSchema = z.object({
    recipeIds: z
        .array(z.string().uuid())
        .min(1, "At least one recipe ID is required"),
});

// Response schemas
const successResponseSchema = createSuccessResponseSchema(
    z.object({
        mealRecipe: mealRecipeAttachSchema,
    }),
);

// Route definition
const attachRecipesToMealRoute = createRoute({
    method: httpPostMethod,
    path: attachMealRecipesPath,
    tags: [mealsTag],
    security: [{ Bearer: [] }],
    request: {
        params: z.object({
            mealId: z.string().uuid(),
        }),
        body: {
            content: {
                [jsonContentType]: {
                    schema: requestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusCreated]: {
            description: recipesAttachedSuccessDescription,
            content: {
                [jsonContentType]: {
                    schema: successResponseSchema,
                },
            },
        },
        [httpStatusBadRequest]: {
            description: badRequestResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusUnauthorized]: {
            description: unauthorizedResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusNotFound]: {
            description: mealOrRecipesNotFoundDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusInternalServerError]: {
            description: internalServerErrorResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
    },
});

export function registerAttachMealRecipes(app: OpenAPIHono) {
    app.openapi(attachRecipesToMealRoute, async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");
        const { recipeIds } = c.req.valid("json");

        // Verify meal exists and belongs to user
        const mealFromDb = await db.query.meals.findFirst({
            where: and(eq(meals.id, mealId), eq(meals.userId, safeUserId)),
        });

        if (!mealFromDb) {
            return c.json(
                {
                    success: false as const,
                    message: mealNotFoundOrDeniedMessage,
                },
                httpStatusNotFound,
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
                {
                    success: false as const,
                    message: recipesNotFoundOrDeniedMessage,
                    errors: `Recipes ${missingRecipeIds.join(", ")} not found or access denied`,
                },
                httpStatusNotFound,
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
                {
                    success: false as const,
                    message: invalidMealRecipeDataMessage,
                    errors: attachEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }

        try {
            await FlowcorePathways.write(mealRecipeAttachedEventType, {
                data: attachEvent.data,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: failedToAttachRecipesMessage,
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: `${recipeIds.length} recipe${recipeIds.length > 1 ? "s" : ""} attached to meal successfully`,
                data: {
                    mealRecipe: attachEvent.data,
                },
            },
            httpStatusCreated,
        );
    });
}
