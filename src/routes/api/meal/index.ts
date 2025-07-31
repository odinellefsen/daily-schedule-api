import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateMeal } from "./meal.create";
import { registerDeleteMeal } from "./meal.delete";
import { registerListMeals } from "./meal.list";
import { registerPatchMeal } from "./meal.patch";
import { registerCreateMealIngredients } from "./meal-ingredients.create";
import { registerDeleteMealIngredients } from "./meal-ingredients.delete";
import { registerPatchMealIngredients } from "./meal-ingredients.patch";
import { registerCreateMealInstructions } from "./meal-instructions.create";
import { registerDeleteMealInstructions } from "./meal-instructions.delete";
import { registerPatchMealInstructions } from "./meal-instructions.patch";

export const meal = new Hono();

meal.use("/*", requireAuth());

// Register all meal routes
registerCreateMeal(meal);
registerDeleteMeal(meal);
registerListMeals(meal);
registerPatchMeal(meal);
registerCreateMealIngredients(meal);
registerDeleteMealIngredients(meal);
registerPatchMealIngredients(meal);
registerCreateMealInstructions(meal);
registerDeleteMealInstructions(meal);
registerPatchMealInstructions(meal);

export default meal;
