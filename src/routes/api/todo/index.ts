import { Hono } from "hono";

import "./todo.create";
import "./todo.patch";
import "./todo.delete";

const todo = new Hono();

export default todo;
