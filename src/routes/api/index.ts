import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import foodItem from "./food-item";
import habit from "./habit";
import meal from "./meal";
import recipe from "./recipe";
import todo from "./todo";
import transformer from "./transformer";

export const api = new OpenAPIHono();

// Root endpoint with OpenAPI documentation
const rootRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["System"],
    summary: "API health check",
    description: "Returns a simple message to confirm the API is running",
    responses: {
        200: {
            description: "API is running",
            content: {
                "text/plain": {
                    schema: z.string().openapi({
                        example: "Daily Scheduler API",
                    }),
                },
            },
        },
    },
});

api.openapi(rootRoute, (c) => {
    return c.text("Daily Scheduler API");
});

api.route("/transformer/", transformer);

api.route("/food-item", foodItem);
api.route("/habit", habit);
api.route("/meal", meal);
api.route("/recipe", recipe);
api.route("/todo", todo);

export default api;
