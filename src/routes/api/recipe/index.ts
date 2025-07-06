import { eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { foodRecipeEventContract } from "../../../contracts/recipe";
import { db } from "../../../db";
import { recipes } from "../../../db/schema";
import { ApiResponse } from "../../../utils/api-responses";
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
            return c.json(ApiResponse.error("Recipe already exists"), 400);
        }

        await FlowcorePathways.write("recipe.v0/recipe.created.v0", {
            data: parsedBody,
        });

        return c.json(
            ApiResponse.success("Recipe created", { recipeId: parsedBody.id })
        );
    } catch (error) {
        if (error instanceof Error) {
            return c.json(
                ApiResponse.error("Validation failed", error.message),
                400
            );
        }
        return c.json(ApiResponse.error("Unknown error"), 500);
    }
});

export default recipe;
