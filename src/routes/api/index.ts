import { Hono } from "hono";
import transformer from "./transformer";

export const api = new Hono();

api.get("/", (c) => {
    return c.text("Daily Scheduler API");
});

api.route("/transformer/", transformer);

export default api;
