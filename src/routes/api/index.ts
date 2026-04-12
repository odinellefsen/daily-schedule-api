import { Hono } from "hono";
import transformer from "./transformer";

export const api = new Hono();
const apiRootMessage = "Daily Scheduler API";
const apiRootRoutePath = "/";
const transformerRoutePath = "/transformer/";

api.get(apiRootRoutePath, (c) => {
    return c.text(apiRootMessage);
});

api.route(transformerRoutePath, transformer);

export default api;
