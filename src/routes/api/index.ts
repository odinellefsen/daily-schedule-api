import { Hono } from "hono";
import foodItem from "./food-item";
import transformer from "./transformer";

export const api = new Hono();

api.get("/", (c) => {
    return c.text("Daily Scheduler API");
});

api.route("/transformer/", transformer);

api.route("/food-item", foodItem);

export default api;
