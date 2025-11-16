import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateFoodItem } from "./food-item.create";
import { registerDeleteFoodItem } from "./food-item.delete";
import { registerListFoodItems } from "./food-item.list";
import { registerCreateFoodItemUnits } from "./food-item-units.create";
import { registerDeleteFoodItemUnits } from "./food-item-units.delete";
import { registerListFoodItemUnits } from "./food-item-units.list";

export const foodItem = new Hono();

foodItem.use("/*", requireAuth());

// Register all food item routes
registerCreateFoodItem(foodItem);
registerDeleteFoodItem(foodItem);
registerListFoodItems(foodItem);
registerCreateFoodItemUnits(foodItem);
registerDeleteFoodItemUnits(foodItem);
registerListFoodItemUnits(foodItem);

export default foodItem;
