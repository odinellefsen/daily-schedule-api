import { eq } from "drizzle-orm";
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

        const existingRecipe = await db.query.recipes.findFirst({
            where: eq(recipes.id, parsedBody.id),
        });

        if (existingRecipe) {
            return c.json(
                {
                    message: "Recipe already exists ❌",
                },
                400
            );
        }

        FlowcorePathways.write("recipe.v0/recipe.created.v0", {
            data: parsedBody,
        });

        return c.json({
            message: "Recipe created ✅",
        });
    } catch (_error) {}
});

export default recipe;
