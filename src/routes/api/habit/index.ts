import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateHabit } from "./habit.create";
import { registerDeleteHabit } from "./habit.delete";
import { registerListHabits } from "./habit.list";
import { registerUpdateHabit } from "./habit.update";

export const habit = new Hono();

habit.use("/*", requireAuth());

// Register all habit routes
registerCreateHabit(habit);
registerListHabits(habit);
registerUpdateHabit(habit);
registerDeleteHabit(habit);

export default habit;
