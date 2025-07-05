import { Hono } from "hono";
import { foodRecipeEventContract } from "../../../contracts/recipe";

export const recipe = new Hono();

recipe.post("/", async (c) => {
    try {
        const body = await c.req.json();

        const parsedBody = foodRecipeEventContract.parse(body);

        console.log("Parsed body", parsedBody);

        return c.json({
            message: "Recipe created ✅",
        });
    } catch (error) {}
});

export default recipe;
