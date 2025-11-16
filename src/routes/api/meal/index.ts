import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";

export const meal = new Hono();

meal.use("/*", requireAuth());

// NOTE: All meal routes are now registered directly in main index.ts for OpenAPI
// - registerCreateMeal
// - registerListMeals
// - registerGetMeal
// - registerAttachMealRecipes

export default meal;
