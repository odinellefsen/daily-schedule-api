// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import {
    type RecipeIngredientsType,
    recipeIngredientsSchema,
} from "../../../contracts/food/recipe";
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";
import { db } from "../../../db";
import { recipes } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

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
const successResponseSchema = createSuccessResponseSchema(recipeIngredientsSchema);

// Route definition
const createRecipeIngredientsRoute = createRoute({
    method: "post",
    path: "/api/recipe/ingredients",
    tags: ["Recipes"],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createRecipeIngredientsRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Recipe ingredients created successfully",
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
            description: "Recipe not found or access denied",
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
                    message: "Recipe not found or access denied",
                },
                404,
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
                    message: "Invalid recipe ingredients data",
                    errors: createRecipeIngredientsEvent.error.errors,
                },
                400,
            );
        }
        const safeCreateRecipeIngredientsEvent =
            createRecipeIngredientsEvent.data;

        try {
            await FlowcorePathways.write(
                "recipe.v0/recipe-ingredients.created.v0",
                {
                    data: safeCreateRecipeIngredientsEvent,
                },
            );
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to create recipe ingredients",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Recipe ingredients created successfully",
                data: safeCreateRecipeIngredientsEvent,
            },
            200,
        );
    });
}
