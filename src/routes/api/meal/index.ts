import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";

export const meal = new Hono();

meal.use("/*", requireAuth());

import "./meal.create";
import "./meal.patch";
import "./meal.delete";
import "./meal-ingredients.create";
import "./meal-ingredients.patch";
import "./meal-ingredients.delete";
import "./meal-instructions.create";
import "./meal-instructions.patch";
import "./meal-instructions.delete";

export default meal;
