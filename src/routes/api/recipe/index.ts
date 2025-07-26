import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";

export const recipe = new Hono();

recipe.use("/*", requireAuth());

import "./recipe.create";
import "./recipe.patch";
import "./recipe.delete";
import "./recipe-ingredients.create";
import "./recipe-ingredients.patch";
import "./recipe-ingredients.delete";
import "./recipe-instructions.create";
import "./recipe-instructions.patch";
import "./recipe-instructions.delete";

export default recipe;
