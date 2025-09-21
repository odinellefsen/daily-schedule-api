import type { OpenAPIHono } from "@hono/zod-openapi";
import { requireAuth } from "../../middleware/auth";

export function registerHabitOpenAPIRoutes(app: OpenAPIHono) {
    // Apply authentication middleware to all habit routes
    app.use("/habit/*", requireAuth());
}
