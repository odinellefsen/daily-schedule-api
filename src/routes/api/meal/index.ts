import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateMeal } from "./meal.create";
import { registerListMeals } from "./meal.list";

export const meal = new Hono();

meal.use("/*", requireAuth());

// Register all meal routes
registerCreateMeal(meal);
registerListMeals(meal);

export default meal;
