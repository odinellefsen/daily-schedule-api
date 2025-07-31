import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCreateTodo } from "./todo.create";
import { registerDeleteTodo } from "./todo.delete";
import { registerListTodos } from "./todo.list";
import { registerPatchTodo } from "./todo.patch";

export const todo = new Hono();

todo.use("/*", requireAuth());

// Register all todo routes
registerCreateTodo(todo);
registerDeleteTodo(todo);
registerListTodos(todo);
registerPatchTodo(todo);

export default todo;
