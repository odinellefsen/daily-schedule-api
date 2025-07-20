import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";

export const foodItem = new Hono();

foodItem.use("/*", requireAuth());

import "./food-item.create";
import "./food-item.patch";
import "./food-item.delete";

export default foodItem;
