import { OpenAPIHono } from "@hono/zod-openapi";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateHabit } from "./habit.create";
import { registerDeleteHabit } from "./habit.delete";
import { registerListHabits } from "./habit.list";
import { registerUpdateHabit } from "./habit.update";

export const habit = new OpenAPIHono();

habit.use("/*", requireAuth());

// Register all habit routes
registerCreateHabit(habit); // POST /text, POST /meal
registerListHabits(habit); // GET /, GET /active, GET /meal/:mealId
registerUpdateHabit(habit); // PATCH /:id
registerDeleteHabit(habit); // DELETE /:id, PATCH /:id/activate, PATCH /:id/deactivate, DELETE /meal/:mealId

export default habit;
