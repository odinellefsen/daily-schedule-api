import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateRecipe } from "./recipe.create";
import { registerDeleteRecipe } from "./recipe.delete";
import { registerListRecipes } from "./recipe.list";
import { registerPatchRecipe } from "./recipe.patch";
import { registerCreateRecipeIngredients } from "./recipe-ingredients.create";
import { registerDeleteRecipeIngredients } from "./recipe-ingredients.delete";
import { registerPatchRecipeIngredients } from "./recipe-ingredients.patch";
import { registerCreateRecipeInstructions } from "./recipe-instructions.create";
import { registerDeleteRecipeInstructions } from "./recipe-instructions.delete";
import { registerPatchRecipeInstructions } from "./recipe-instructions.patch";

export const recipe = new Hono();

recipe.use("/*", requireAuth());

// Register all recipe routes
registerCreateRecipe(recipe);
registerDeleteRecipe(recipe);
registerListRecipes(recipe);
registerPatchRecipe(recipe);
registerCreateRecipeIngredients(recipe);
registerDeleteRecipeIngredients(recipe);
registerPatchRecipeIngredients(recipe);
registerCreateRecipeInstructions(recipe);
registerDeleteRecipeInstructions(recipe);
registerPatchRecipeInstructions(recipe);

export default recipe;
