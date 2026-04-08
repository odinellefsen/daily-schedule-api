import { Hono } from "hono";
import transformer from "./transformer";

export const api = new Hono();
const apiRootMessage = "Daily Scheduler API";

api.get("/", (c) => {
    return c.text(apiRootMessage);
});

api.route("/transformer/", transformer);

export default api;
