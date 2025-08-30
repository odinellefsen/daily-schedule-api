import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateHabit } from "./habit.create";
import { registerDeleteHabit } from "./habit.delete";
import { registerListHabits } from "./habit.list";
import { registerUpdateHabit } from "./habit.update";

export const habit = new Hono();

habit.use("/*", requireAuth());

// Register all instruction habit routes
registerCreateHabit(habit); // POST /batch for batch creation
registerListHabits(habit); // GET /, GET /active, GET /meal/:mealId
registerUpdateHabit(habit); // PATCH /:id
registerDeleteHabit(habit); // DELETE /:id, PATCH /:id/activate, PATCH /:id/deactivate, DELETE /meal/:mealId

export default habit;
