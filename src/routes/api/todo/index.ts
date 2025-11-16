import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";

export const todo = new Hono();

todo.use("/*", requireAuth());

// NOTE: All todo routes are now registered directly in main index.ts for OpenAPI
// - registerCreateTodo
// - registerListTodos

export default todo;
