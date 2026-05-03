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
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const recipesTag = "Recipes";
const httpPostMethod = "post";
const createRecipePath = "/api/recipe";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusConflict = 409;
const httpStatusInternalServerError = 500;
const recipeCreatedSuccessMessage = "Recipe created successfully";
const recipeNameExistsMessage = "Recipe with name already exists";
const invalidRecipeDataMessage = "Invalid recipe data";
const failedToCreateRecipeMessage = "Failed to create recipe";
const recipeCreatedEventType = "recipe.v0/recipe.created.v0";
const conflictResponseDescription =
    "Conflict - Recipe with name already exists";
const badRequestResponseDescription = "Bad Request";
const unauthorizedResponseDescription = "Unauthorized";
const internalServerErrorResponseDescription = "Internal Server Error";

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
const successResponseSchema = createSuccessResponseSchema(recipeSchema);

// Route definition
const createRecipeRoute = createRoute({
    method: httpPostMethod,
    path: createRecipePath,
    tags: [recipesTag],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: createRecipeRequestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusOk]: {
            description: recipeCreatedSuccessMessage,
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
        [httpStatusConflict]: {
            description: conflictResponseDescription,
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
                    message: recipeNameExistsMessage,
                },
                httpStatusConflict,
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
                    message: invalidRecipeDataMessage,
                    errors: createRecipeEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }
        const safeCreateRecipeEvent = createRecipeEvent.data;

        try {
            await FlowcorePathways.write(recipeCreatedEventType, {
                data: safeCreateRecipeEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: failedToCreateRecipeMessage,
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: recipeCreatedSuccessMessage,
                data: safeCreateRecipeEvent,
            },
            httpStatusOk,
        );
    });
}
