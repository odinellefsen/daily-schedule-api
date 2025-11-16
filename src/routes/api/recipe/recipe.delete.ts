import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import {
    type RecipeArchiveType,
    recipeArchiveSchema,
} from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { recipes } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const deleteRecipeRequestSchema = z.object({
    recipeId: z.string().uuid(),
});

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: recipeArchiveSchema,
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
            description: "Recipe archived successfully",
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

        const recipeArchived: RecipeArchiveType = {
            recipeId: recipeFromDb.id,
        };

        const recipeArchivedEvent =
            recipeArchiveSchema.safeParse(recipeArchived);
        if (!recipeArchivedEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid recipe archived data",
                    errors: recipeArchivedEvent.error.errors,
                },
                400,
            );
        }
        const safeRecipeArchivedEvent = recipeArchivedEvent.data;

        try {
            await FlowcorePathways.write("recipe.v0/recipe.deleted.v0", {
                data: safeRecipeArchivedEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to archive recipe",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Recipe archived successfully",
                data: safeRecipeArchivedEvent,
            },
            200,
        );
    });
}
