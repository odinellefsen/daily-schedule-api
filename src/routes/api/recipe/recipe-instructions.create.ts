// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { eq, max } from "drizzle-orm";
import {
    type RecipeInstructionsType,
    recipeInstructionsSchema,
} from "../../../contracts/food/recipe";
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";
import { db } from "../../../db";
import { recipeInstructions, recipes } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

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
    method: "post",
    path: "/api/recipe/instructions",
    tags: ["Recipes"],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createRecipeInstructionsRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Recipe instructions created successfully",
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
                    message: "Recipe not found",
                },
                404,
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
                    message: "Invalid recipe instructions data",
                    errors: createRecipeInstructionsEvent.error.errors,
                },
                400,
            );
        }
        const safeCreateRecipeInstructionsEvent =
            createRecipeInstructionsEvent.data;

        try {
            await FlowcorePathways.write(
                "recipe.v0/recipe-instructions.created.v0",
                {
                    data: safeCreateRecipeInstructionsEvent,
                },
            );
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to create recipe instructions",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Recipe instructions created successfully",
                data: safeCreateRecipeInstructionsEvent,
            },
            200,
        );
    });
}
