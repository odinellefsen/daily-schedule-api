import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { registerHabitOpenAPIRoutes } from "../handlers/habit";

// Simple health check route
const healthRoute = createRoute({
    method: "get",
    path: "/health",
    tags: ["Health"],
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: z.object({
                        ok: z.boolean(),
                        message: z.string(),
                        timestamp: z.string(),
                    }),
                },
            },
            description: "Health check response",
        },
    },
});

export function registerOpenAPIRoutes(app: OpenAPIHono) {
    // Add a simple health check route
    app.openapi(healthRoute, (c) => {
        return c.json({
            ok: true,
            message: "API is healthy",
            timestamp: new Date().toISOString(),
        });
    });

    // Register habit routes
    registerHabitOpenAPIRoutes(app);

    // TODO: Register other routes as you convert them
    // registerFoodItemOpenAPIRoutes(app);
    // registerMealOpenAPIRoutes(app);
    // registerRecipeOpenAPIRoutes(app);
    // registerTodoOpenAPIRoutes(app);
}
