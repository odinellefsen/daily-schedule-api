import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateHabit } from "./habit.create";
import { registerListHabits } from "./habit.list";

export const habit = new Hono();

habit.use("/*", requireAuth());

// Register all instruction habit routes
registerCreateHabit(habit); // POST /batch for batch creation
registerListHabits(habit); // GET /, GET /active, GET /meal/:mealId

export default habit;
