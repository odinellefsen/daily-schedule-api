import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerListTodos } from "./todo.list";

export const todo = new Hono();

todo.use("/*", requireAuth());

// Register all todo routes
// NOTE: registerCreateTodo is now registered directly in main index.ts for OpenAPI
// registerCreateTodo(todo);
registerListTodos(todo);

export default todo;
