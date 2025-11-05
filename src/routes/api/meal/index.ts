import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateMeal } from "./meal.create";
import { registerGetMeal } from "./meal.get";
import { registerListMeals } from "./meal.list";
import { registerAttachMealRecipes } from "./meal-recipes.attach";
import { registerListMealRecipes } from "./meal-recipes.list";

export const meal = new Hono();

meal.use("/*", requireAuth());

// Register all meal routes
registerCreateMeal(meal);
registerListMeals(meal);
registerGetMeal(meal);
registerAttachMealRecipes(meal);
registerListMealRecipes(meal);

export default meal;
