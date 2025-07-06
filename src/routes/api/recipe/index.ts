import { eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { foodRecipeEventContract } from "../../../contracts/recipe";
import { db } from "../../../db";
import { recipes } from "../../../db/schema";
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
            return c.json({ message: "Recipe already exists ❌" }, 400);
        }

        await FlowcorePathways.write("recipe.v0/recipe.created.v0", {
            data: parsedBody,
        });

        return c.json({ message: "Recipe created ✅" });
    } catch (error) {
        if (error instanceof Error) {
            return c.json(
                { message: "Validation failed", errors: error.message },
                400
            );
        }
        return c.json({ message: "Unknown error" }, 500);
    }
});

export default recipe;
