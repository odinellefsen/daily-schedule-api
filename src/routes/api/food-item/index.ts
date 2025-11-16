import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerDeleteFoodItem } from "./food-item.delete";
import { registerCreateFoodItemUnits } from "./food-item-units.create";
import { registerDeleteFoodItemUnits } from "./food-item-units.delete";
import { registerListFoodItemUnits } from "./food-item-units.list";

export const foodItem = new Hono();

foodItem.use("/*", requireAuth());

// NOTE: Some routes are now registered directly in main index.ts for OpenAPI:
// - registerCreateFoodItem
// - registerListFoodItems

// Non-OpenAPI routes still registered here (to be converted)
registerDeleteFoodItem(foodItem);
registerCreateFoodItemUnits(foodItem);
registerDeleteFoodItemUnits(foodItem);
registerListFoodItemUnits(foodItem);

export default foodItem;
