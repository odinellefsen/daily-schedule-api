import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateTodo } from "./todo.create";
import { registerListTodos } from "./todo.list";

export const todo = new Hono();

todo.use("/*", requireAuth());

// Register all todo routes
registerCreateTodo(todo);
registerListTodos(todo);

export default todo;
