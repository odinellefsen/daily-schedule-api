import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";

export const recipe = new Hono();

recipe.use("/*", requireAuth());

// NOTE: All recipe routes are now registered directly in main index.ts for OpenAPI
// - registerCreateRecipe
// - registerDeleteRecipe
// - registerListRecipes
// - registerCreateRecipeIngredients
// - registerCreateRecipeInstructions

export default recipe;
