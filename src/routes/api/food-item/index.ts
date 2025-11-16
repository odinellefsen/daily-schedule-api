import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";

export const foodItem = new Hono();

foodItem.use("/*", requireAuth());

// NOTE: All food item routes are now registered directly in main index.ts for OpenAPI:
// - registerCreateFoodItem
// - registerListFoodItems
// - registerDeleteFoodItem
// - registerCreateFoodItemUnits
// - registerListFoodItemUnits
// - registerDeleteFoodItemUnits

export default foodItem;
