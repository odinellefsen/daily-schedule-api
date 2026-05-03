// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import {
    type RecipeIngredientsType,
    recipeIngredientsSchema,
} from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { recipes } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const recipesTag = "Recipes";
const httpPostMethod = "post";
const createRecipeIngredientsPath = "/api/recipe/ingredients";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusNotFound = 404;
const httpStatusInternalServerError = 500;
const recipeIngredientsCreatedSuccessMessage =
    "Recipe ingredients created successfully";
const recipeNotFoundOrDeniedMessage = "Recipe not found or access denied";
const invalidRecipeIngredientsDataMessage = "Invalid recipe ingredients data";
const failedToCreateRecipeIngredientsMessage =
    "Failed to create recipe ingredients";
const recipeIngredientsCreatedEventType =
    "recipe.v0/recipe-ingredients.created.v0";
const badRequestResponseDescription = "Bad Request";
const unauthorizedResponseDescription = "Unauthorized";
const recipeNotFoundOpenApiDescription = "Recipe not found or access denied";
const internalServerErrorResponseDescription = "Internal Server Error";

// Request schema
const createRecipeIngredientsRequestSchema = z.object({
    recipeId: z.string().uuid(),
    ingredients: z
        .array(
            z.object({
                ingredientText: z.string().min(1).max(150),
            }),
        )
        .min(1)
        .max(50),
});

// Response schemas
const successResponseSchema = createSuccessResponseSchema(
    recipeIngredientsSchema,
);

// Route definition
const createRecipeIngredientsRoute = createRoute({
    method: httpPostMethod,
    path: createRecipeIngredientsPath,
    tags: [recipesTag],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: createRecipeIngredientsRequestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusOk]: {
            description: recipeIngredientsCreatedSuccessMessage,
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
            description: recipeNotFoundOpenApiDescription,
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

export function registerCreateRecipeIngredients(app: OpenAPIHono) {
    app.openapi(createRecipeIngredientsRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeCreateRecipeIngredientsJsonBody = c.req.valid("json");

        // Verify recipe exists and belongs to user
        const recipeFromDb = await db.query.recipes.findFirst({
            where: eq(recipes.id, safeCreateRecipeIngredientsJsonBody.recipeId),
        });

        if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
            return c.json(
                {
                    success: false as const,
                    message: recipeNotFoundOrDeniedMessage,
                },
                httpStatusNotFound,
            );
        }

        const newRecipeIngredients: RecipeIngredientsType = {
            recipeId: safeCreateRecipeIngredientsJsonBody.recipeId,
            ingredients: safeCreateRecipeIngredientsJsonBody.ingredients.map(
                (ingredient) => ({
                    id: crypto.randomUUID(),
                    ingredientText: ingredient.ingredientText,
                }),
            ),
        };

        const createRecipeIngredientsEvent =
            recipeIngredientsSchema.safeParse(newRecipeIngredients);
        if (!createRecipeIngredientsEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: invalidRecipeIngredientsDataMessage,
                    errors: createRecipeIngredientsEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }
        const safeCreateRecipeIngredientsEvent =
            createRecipeIngredientsEvent.data;

        try {
            await FlowcorePathways.write(recipeIngredientsCreatedEventType, {
                data: safeCreateRecipeIngredientsEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: failedToCreateRecipeIngredientsMessage,
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: recipeIngredientsCreatedSuccessMessage,
                data: safeCreateRecipeIngredientsEvent,
            },
            httpStatusOk,
        );
    });
}
