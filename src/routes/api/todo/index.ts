import { Hono } from "hono";

import "./todo.create";
import "./todo.patch";
import "./todo.delete";
import "./todo.list";

const todo = new Hono();

export default todo;
