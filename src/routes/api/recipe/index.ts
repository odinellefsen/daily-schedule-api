import { eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { ZodError } from "zod";
import { foodRecipeEventContract } from "../../../contracts/recipe";
import { db } from "../../../db";
import { recipes } from "../../../db/schema";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

export const recipe = new Hono();

recipe.post("/", async (c) => {
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
            data: parsedBody,
        });

        return c.json(
            ApiResponse.success("Recipe created", { recipeId: parsedBody.id }),
            StatusCodes.CREATED
        );
    } catch (error) {
        if (error instanceof ZodError) {
            // Format Zod validation errors for better client experience
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
