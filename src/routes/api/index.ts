import { Hono } from "hono";
import transformer from "./transformer";

export const api = new Hono();
const apiRootMessage = "Daily Scheduler API";
const transformerRoutePath = "/transformer/";

api.get("/", (c) => {
    return c.text(apiRootMessage);
});

api.route(transformerRoutePath, transformer);

export default api;
