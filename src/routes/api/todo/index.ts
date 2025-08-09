import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { registerCancelTodo } from "./todo.cancel";
import { registerCompleteTodo } from "./todo.complete";
import { registerCreateTodo } from "./todo.create";
import { registerDeleteTodo } from "./todo.delete";
import { registerListTodos } from "./todo.list";
import { registerUpdateTodoRelations } from "./todo.relations.update";

export const todo = new Hono();

todo.use("/*", requireAuth());

// Register all todo routes
registerCreateTodo(todo);
registerDeleteTodo(todo);
registerListTodos(todo);
registerCompleteTodo(todo);
registerUpdateTodoRelations(todo);
registerCancelTodo(todo);

export default todo;
