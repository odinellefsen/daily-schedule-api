import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";

export const habit = new Hono();

habit.use("/*", requireAuth());

// NOTE: Habit route is now registered directly in main index.ts for OpenAPI
// - registerCreateHabit

export default habit;
