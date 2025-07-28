import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";

export const foodItem = new Hono();

foodItem.use("/*", requireAuth());

import "./food-item.create";
import "./food-item.patch";
import "./food-item.delete";
import "./food-item.list";
import "./food-item-units.create";
import "./food-item-units.patch";
import "./food-item-units.delete";
import "./food-item-units.list";

export default foodItem;
