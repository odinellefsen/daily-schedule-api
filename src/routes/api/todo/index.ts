import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";

export const todo = new Hono();

todo.use("/*", requireAuth());

export default todo;
