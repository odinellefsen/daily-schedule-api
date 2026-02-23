// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import {
    MealTimingEnum,
    type RecipeMetadataType,
    recipeSchema,
} from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { recipes } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const createRecipeRequestSchema = z.object({
    nameOfTheRecipe: z
        .string()
        .min(1, "Recipe name min length is 1")
        .max(75, "Recipe name max length is 75"),
    generalDescriptionOfTheRecipe: z.string().max(250).optional(),
    whenIsItConsumed: z.array(z.nativeEnum(MealTimingEnum)).optional(),
});

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: recipeSchema,
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

// Route definition
const createRecipeRoute = createRoute({
    method: "post",
    path: "/api/recipe",
    tags: ["Recipes"],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createRecipeRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Recipe created successfully",
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
        409: {
            description: "Conflict - Recipe with name already exists",
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

export function registerCreateRecipe(app: OpenAPIHono) {
    app.openapi(createRecipeRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeCreateRecipeJsonBody = c.req.valid("json");

        const existingRecipe = await db
            .select()
            .from(recipes)
            .where(
                and(
                    eq(
                        recipes.nameOfTheRecipe,
                        safeCreateRecipeJsonBody.nameOfTheRecipe,
                    ),
                    eq(recipes.userId, safeUserId),
                ),
            );
        if (existingRecipe.length > 0) {
            return c.json(
                {
                    success: false as const,
                    message: "Recipe with name already exists",
                },
                409,
            );
        }

        const newRecipe: RecipeMetadataType = {
            id: crypto.randomUUID(),
            userId: safeUserId,
            nameOfTheRecipe: safeCreateRecipeJsonBody.nameOfTheRecipe,
            generalDescriptionOfTheRecipe:
                safeCreateRecipeJsonBody.generalDescriptionOfTheRecipe,
            whenIsItConsumed: safeCreateRecipeJsonBody.whenIsItConsumed,
        };

        const createRecipeEvent = recipeSchema.safeParse(newRecipe);
        if (!createRecipeEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid recipe data",
                    errors: createRecipeEvent.error.errors,
                },
                400,
            );
        }
        const safeCreateRecipeEvent = createRecipeEvent.data;

        try {
            await FlowcorePathways.write("recipe.v0/recipe.created.v0", {
                data: safeCreateRecipeEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to create recipe",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Recipe created successfully",
                data: safeCreateRecipeEvent,
            },
            200,
        );
    });
}
