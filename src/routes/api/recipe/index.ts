import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateRecipe } from "./recipe.create";
import { registerDeleteRecipe } from "./recipe.delete";
import { registerListRecipes } from "./recipe.list";
import { registerCreateRecipeIngredients } from "./recipe-ingredients.create";
import { registerCreateRecipeInstructions } from "./recipe-instructions.create";

export const recipe = new Hono();

recipe.use("/*", requireAuth());

// Register all recipe routes
registerCreateRecipe(recipe);
registerDeleteRecipe(recipe);
registerListRecipes(recipe);
registerCreateRecipeIngredients(recipe);
registerCreateRecipeInstructions(recipe);

export default recipe;
