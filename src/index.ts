import { Hono } from "hono";
import api from "./routes/api";

export const app = new Hono();

app.route("/api", api);

export default {
  port: 3000,
  fetch: app.fetch,
};
