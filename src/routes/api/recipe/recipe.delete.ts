// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import {
    type RecipeDeletedType,
    recipeDeletedSchema,
} from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { recipes } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const recipesTag = "Recipes";
const httpDeleteMethod = "delete";
const deleteRecipePath = "/api/recipe";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusNotFound = 404;
const httpStatusInternalServerError = 500;
const recipeDeletedSuccessMessage = "Recipe deleted successfully";
const recipeNotFoundMessage = "Recipe not found";
const invalidRecipeDeletedDataMessage = "Invalid recipe deleted data";
const failedToDeleteRecipeMessage = "Failed to delete recipe";
const recipeDeletedEventType = "recipe.v0/recipe.deleted.v0";
const badRequestResponseDescription = "Bad Request";
const unauthorizedResponseDescription = "Unauthorized";
const recipeNotFoundResponseDescription = "Recipe not found";
const internalServerErrorResponseDescription = "Internal Server Error";

// Request schema
const deleteRecipeRequestSchema = z.object({
    recipeId: z.string().uuid(),
});

// Response schemas
const successResponseSchema = createSuccessResponseSchema(recipeDeletedSchema);

// Route definition
const deleteRecipeRoute = createRoute({
    method: httpDeleteMethod,
    path: deleteRecipePath,
    tags: [recipesTag],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: deleteRecipeRequestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusOk]: {
            description: recipeDeletedSuccessMessage,
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
            description: recipeNotFoundResponseDescription,
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

export function registerDeleteRecipe(app: OpenAPIHono) {
    app.openapi(deleteRecipeRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeDeleteRecipeRequestBody = c.req.valid("json");

        const recipeFromDb = await db.query.recipes.findFirst({
            where: and(
                eq(recipes.id, safeDeleteRecipeRequestBody.recipeId),
                eq(recipes.userId, safeUserId),
            ),
        });

        if (!recipeFromDb) {
            return c.json(
                {
                    success: false as const,
                    message: recipeNotFoundMessage,
                },
                httpStatusNotFound,
            );
        }

        const recipeDeleted: RecipeDeletedType = {
            recipeId: recipeFromDb.id,
        };

        const recipeDeletedEvent = recipeDeletedSchema.safeParse(recipeDeleted);
        if (!recipeDeletedEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: invalidRecipeDeletedDataMessage,
                    errors: recipeDeletedEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }
        const safeRecipeDeletedEvent = recipeDeletedEvent.data;

        try {
            await FlowcorePathways.write(recipeDeletedEventType, {
                data: safeRecipeDeletedEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: failedToDeleteRecipeMessage,
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: recipeDeletedSuccessMessage,
                data: safeRecipeDeletedEvent,
            },
            httpStatusOk,
        );
    });
}
