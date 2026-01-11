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
import { getFlowcorePathways } from "../../../utils/flowcore";

// Request schema
const deleteRecipeRequestSchema = z.object({
    recipeId: z.string().uuid(),
});

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: recipeDeletedSchema,
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

// Route definition
const deleteRecipeRoute = createRoute({
    method: "delete",
    path: "/api/recipe",
    tags: ["Recipes"],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: deleteRecipeRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Recipe deleted successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema,
                },
            },
        },
        400: {
            description: "Bad Request",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        404: {
            description: "Recipe not found",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
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
                    message: "Recipe not found",
                },
                404,
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
                    message: "Invalid recipe deleted data",
                    errors: recipeDeletedEvent.error.errors,
                },
                400,
            );
        }
        const safeRecipeDeletedEvent = recipeDeletedEvent.data;

        try {
            const FlowcorePathways = await getFlowcorePathways();
            await FlowcorePathways.write("recipe.v0/recipe.deleted.v0", {
                data: safeRecipeDeletedEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to delete recipe",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Recipe deleted successfully",
                data: safeRecipeDeletedEvent,
            },
            200,
        );
    });
}
