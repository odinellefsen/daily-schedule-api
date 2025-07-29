import { Hono } from "hono";
import api from "./routes/api";

export const app = new Hono();

app.route("/api", api);

export default {
    port: 3005,
    fetch: app.fetch,
};
