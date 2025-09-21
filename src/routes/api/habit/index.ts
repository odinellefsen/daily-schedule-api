import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateHabit } from "./habit.create";

export const habit = new Hono();

habit.use("/*", requireAuth());

// Register all instruction habit routes
registerCreateHabit(habit); // POST /batch for batch creation

export default habit;
