import { eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { ZodError } from "zod";
import {
    foodRecipeEventContract,
    recipeIngredientsSchema,
    recipeInstructionsSchema,
    recipeMetadataSchema,
} from "../../../contracts/recipe";
import { db } from "../../../db";
import { recipes } from "../../../db/schema";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

export const recipe = new Hono();

// Create recipe metadata (basic recipe info)
recipe.post("/", async (c) => {
    try {
        const body = await c.req.json();
        const parsedBody = recipeMetadataSchema.parse(body);

        // Check for existing recipe
        const existingRecipe = await db.query.recipes.findFirst({
            where: or(
                eq(recipes.id, parsedBody.id),
                eq(recipes.name, parsedBody.nameOfTheFoodRecipe)
            ),
        });

        if (existingRecipe) {
            return c.json(
                ApiResponse.error("Recipe already exists"),
                StatusCodes.CONFLICT
            );
        }

        await FlowcorePathways.write("recipe.v0/recipe.created.v0", {
            data: parsedBody,
        });

        return c.json(
            ApiResponse.success("Recipe metadata created", {
                recipeId: parsedBody.id,
            }),
            StatusCodes.CREATED
        );
    } catch (error) {
        if (error instanceof ZodError) {
            const formattedErrors = error.errors.map((err) => ({
                field: err.path.join("."),
                message: err.message,
                code: err.code,
            }));

            return c.json(
                ApiResponse.error("Request validation failed", formattedErrors),
                StatusCodes.BAD_REQUEST
            );
        }

        if (error instanceof Error) {
            return c.json(
                ApiResponse.error("Validation failed", error.message),
                StatusCodes.BAD_REQUEST
            );
        }

        return c.json(
            ApiResponse.error("Unknown error"),
            StatusCodes.SERVER_ERROR
        );
    }
});

// Add/update recipe ingredients
recipe.post("/:id/ingredients", async (c) => {
    try {
        const recipeId = c.req.param("id");
        const body = await c.req.json();

        const parsedBody = recipeIngredientsSchema.parse({
            recipeId: recipeId,
            ingredientsOfTheFoodRecipe:
                body.ingredientsOfTheFoodRecipe || body.ingredients,
        });

        // Check if recipe exists
        const existingRecipe = await db.query.recipes.findFirst({
            where: eq(recipes.id, recipeId),
        });

        if (!existingRecipe) {
            return c.json(
                ApiResponse.error("Recipe not found"),
                StatusCodes.NOT_FOUND
            );
        }

        // Determine if this is creation or update based on existing ingredients
        // For now, we'll always use the updated event since we don't have ingredients table yet
        await FlowcorePathways.write(
            "recipe.v0/recipe.ingredients.updated.v0",
            {
                data: parsedBody,
            }
        );

        return c.json(
            ApiResponse.success("Recipe ingredients updated", {
                recipeId: recipeId,
            }),
            StatusCodes.OK
        );
    } catch (error) {
        if (error instanceof ZodError) {
            const formattedErrors = error.errors.map((err) => ({
                field: err.path.join("."),
                message: err.message,
                code: err.code,
            }));

            return c.json(
                ApiResponse.error("Request validation failed", formattedErrors),
                StatusCodes.BAD_REQUEST
            );
        }

        if (error instanceof Error) {
            return c.json(
                ApiResponse.error("Validation failed", error.message),
                StatusCodes.BAD_REQUEST
            );
        }

        return c.json(
            ApiResponse.error("Unknown error"),
            StatusCodes.SERVER_ERROR
        );
    }
});

// Add/update recipe instructions
recipe.post("/:id/instructions", async (c) => {
    try {
        const recipeId = c.req.param("id");
        const body = await c.req.json();

        const parsedBody = recipeInstructionsSchema.parse({
            recipeId: recipeId,
            stepForStepInstructionsToMakeTheFoodRecipe:
                body.stepForStepInstructionsToMakeTheFoodRecipe ||
                body.instructions,
        });

        // Check if recipe exists
        const existingRecipe = await db.query.recipes.findFirst({
            where: eq(recipes.id, recipeId),
        });

        if (!existingRecipe) {
            return c.json(
                ApiResponse.error("Recipe not found"),
                StatusCodes.NOT_FOUND
            );
        }

        // Determine if this is creation or update based on existing instructions
        // For now, we'll always use the updated event since we don't have instructions table yet
        await FlowcorePathways.write(
            "recipe.v0/recipe.instructions.updated.v0",
            {
                data: parsedBody,
            }
        );

        return c.json(
            ApiResponse.success("Recipe instructions updated", {
                recipeId: recipeId,
            }),
            StatusCodes.OK
        );
    } catch (error) {
        if (error instanceof ZodError) {
            const formattedErrors = error.errors.map((err) => ({
                field: err.path.join("."),
                message: err.message,
                code: err.code,
            }));

            return c.json(
                ApiResponse.error("Request validation failed", formattedErrors),
                StatusCodes.BAD_REQUEST
            );
        }

        if (error instanceof Error) {
            return c.json(
                ApiResponse.error("Validation failed", error.message),
                StatusCodes.BAD_REQUEST
            );
        }

        return c.json(
            ApiResponse.error("Unknown error"),
            StatusCodes.SERVER_ERROR
        );
    }
});

// Legacy endpoint for backward compatibility - creates complete recipe
recipe.post("/complete", async (c) => {
    try {
        const body = await c.req.json();
        const parsedBody = foodRecipeEventContract.parse(body);

        // Check for existing recipe
        const existingRecipe = await db.query.recipes.findFirst({
            where: or(
                eq(recipes.id, parsedBody.id),
                eq(recipes.name, parsedBody.nameOfTheFoodRecipe)
            ),
        });

        if (existingRecipe) {
            return c.json(
                ApiResponse.error("Recipe already exists"),
                StatusCodes.CONFLICT
            );
        }

        await FlowcorePathways.write("recipe.v0/recipe.created.v0", {
            data: {
                id: parsedBody.id,
                whenIsMealEaten: parsedBody.whenIsMealEaten,
                nameOfTheFoodRecipe: parsedBody.nameOfTheFoodRecipe,
                generalDescriptionOfTheFoodRecipe:
                    parsedBody.generalDescriptionOfTheFoodRecipe,
            },
        });

        return c.json(
            ApiResponse.success("Recipe created", { recipeId: parsedBody.id }),
            StatusCodes.CREATED
        );
    } catch (error) {
        if (error instanceof ZodError) {
            const formattedErrors = error.errors.map((err) => ({
                field: err.path.join("."),
                message: err.message,
                code: err.code,
            }));

            return c.json(
                ApiResponse.error("Request validation failed", formattedErrors),
                StatusCodes.BAD_REQUEST
            );
        }

        if (error instanceof Error) {
            return c.json(
                ApiResponse.error("Validation failed", error.message),
                StatusCodes.BAD_REQUEST
            );
        }

        return c.json(
            ApiResponse.error("Unknown error"),
            StatusCodes.SERVER_ERROR
        );
    }
});

export default recipe;
