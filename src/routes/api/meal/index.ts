import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateMeal } from "./meal.create";
import { registerDeleteMeal } from "./meal.delete";
import { registerListMeals } from "./meal.list";
import { registerPatchMeal } from "./meal.patch";

export const meal = new Hono();

meal.use("/*", requireAuth());

// Register main meal routes
registerCreateMeal(meal);
registerDeleteMeal(meal);
registerListMeals(meal);
registerPatchMeal(meal);

// TODO: Fix meal-ingredients and meal-instructions routes
import "./meal-ingredients.create";
import "./meal-ingredients.patch";
import "./meal-ingredients.delete";
import "./meal-instructions.create";
import "./meal-instructions.patch";
import "./meal-instructions.delete";

export default meal;
