// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { eq, max } from "drizzle-orm";
import {
    type RecipeInstructionsType,
    recipeInstructionsSchema,
} from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { recipeInstructions, recipes } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const recipesTag = "Recipes";
const httpPostMethod = "post";
const createRecipeInstructionsPath = "/api/recipe/instructions";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusNotFound = 404;
const httpStatusInternalServerError = 500;
const recipeInstructionsCreatedSuccessMessage =
    "Recipe instructions created successfully";
const recipeNotFoundMessage = "Recipe not found";
const invalidRecipeInstructionsDataMessage = "Invalid recipe instructions data";
const failedToCreateRecipeInstructionsMessage =
    "Failed to create recipe instructions";
const recipeInstructionsCreatedEventType =
    "recipe.v0/recipe-instructions.created.v0";
const badRequestResponseDescription = "Bad Request";
const unauthorizedResponseDescription = "Unauthorized";
const recipeNotFoundOpenApiDescription = "Recipe not found";
const internalServerErrorResponseDescription = "Internal Server Error";

// Request schema
const createRecipeInstructionsRequestSchema = z.object({
    recipeId: z.string().uuid(),
    stepByStepInstructions: z
        .array(
            z.object({
                stepInstruction: z.string().min(1).max(250),
                foodItemUnitsUsedInStep: z
                    .array(
                        z.object({
                            foodItemUnitId: z.string().uuid(),
                            quantityOfFoodItemUnit: z
                                .number()
                                .positive()
                                .max(1_000_000)
                                .default(1),
                        }),
                    )
                    .optional(),
            }),
        )
        .min(1)
        .max(30),
});

// Response schemas
const successResponseSchema = createSuccessResponseSchema(
    recipeInstructionsSchema,
);

// Route definition
const createRecipeInstructionsRoute = createRoute({
    method: httpPostMethod,
    path: createRecipeInstructionsPath,
    tags: [recipesTag],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: createRecipeInstructionsRequestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusOk]: {
            description: recipeInstructionsCreatedSuccessMessage,
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

export function registerCreateRecipeInstructions(app: OpenAPIHono) {
    app.openapi(createRecipeInstructionsRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeCreateRecipeInstructionsJsonBody = c.req.valid("json");

        // Verify recipe exists and belongs to user
        const recipeFromDb = await db.query.recipes.findFirst({
            where: eq(
                recipes.id,
                safeCreateRecipeInstructionsJsonBody.recipeId,
            ),
        });

        if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
            return c.json(
                {
                    success: false as const,
                    message: recipeNotFoundMessage,
                },
                httpStatusNotFound,
            );
        }

        // Get the current maximum step number for this recipe
        const maxStepResult = await db
            .select({ maxStep: max(recipeInstructions.instructionNumber) })
            .from(recipeInstructions)
            .where(
                eq(
                    recipeInstructions.recipeId,
                    safeCreateRecipeInstructionsJsonBody.recipeId,
                ),
            );

        const currentMaxStep = maxStepResult[0]?.maxStep ?? 0;

        const newRecipeInstructions: RecipeInstructionsType = {
            recipeId: safeCreateRecipeInstructionsJsonBody.recipeId,
            stepByStepInstructions:
                safeCreateRecipeInstructionsJsonBody.stepByStepInstructions.map(
                    (step, index) => ({
                        id: crypto.randomUUID(),
                        instructionNumber: currentMaxStep + index + 1,
                        stepInstruction: step.stepInstruction,
                        foodItemUnitsUsedInStep: step.foodItemUnitsUsedInStep,
                    }),
                ),
        };

        const createRecipeInstructionsEvent =
            recipeInstructionsSchema.safeParse(newRecipeInstructions);
        if (!createRecipeInstructionsEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: invalidRecipeInstructionsDataMessage,
                    errors: createRecipeInstructionsEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }
        const safeCreateRecipeInstructionsEvent =
            createRecipeInstructionsEvent.data;

        try {
            await FlowcorePathways.write(recipeInstructionsCreatedEventType, {
                data: safeCreateRecipeInstructionsEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: failedToCreateRecipeInstructionsMessage,
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: recipeInstructionsCreatedSuccessMessage,
                data: safeCreateRecipeInstructionsEvent,
            },
            httpStatusOk,
        );
    });
}
