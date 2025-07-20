import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";

export const foodItem = new Hono();

// Apply Clerk authentication middleware to all food-item routes
foodItem.use("/*", requireAuth());

// Import route handlers (they register themselves with the foodItem router)
import "./food-item.create";
import "./food-item.patch";
import "./food-item.delete";

export default foodItem;
