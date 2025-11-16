import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import api from "./routes/api";

export const app = new OpenAPIHono();

// Configure CORS to allow requests from frontend
app.use(
    "/*",
    cors({
        origin: [
            "https://flowday.io",
            "https://www.flowday.io",
            "http://localhost:3000",
            "http://localhost:3001",
        ],
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        maxAge: 86400,
        credentials: true,
    }),
);

// Register security schemes
app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
});

// Import and register OpenAPI routes
import { requireAuth } from "./middleware/auth";
import { registerCreateFoodItem } from "./routes/api/food-item/food-item.create";
import { registerDeleteFoodItem } from "./routes/api/food-item/food-item.delete";
import { registerListFoodItems } from "./routes/api/food-item/food-item.list";
import { registerCreateFoodItemUnits } from "./routes/api/food-item/food-item-units.create";
import { registerDeleteFoodItemUnits } from "./routes/api/food-item/food-item-units.delete";
import { registerListFoodItemUnits } from "./routes/api/food-item/food-item-units.list";
import { registerCreateTodo } from "./routes/api/todo/todo.create";
import { registerListTodos } from "./routes/api/todo/todo.list";

// Apply auth middleware
app.use("/api/todo/*", requireAuth());
app.use("/api/food-item/*", requireAuth());

// Register OpenAPI routes directly on main app
registerCreateTodo(app);
registerListTodos(app);
registerCreateFoodItem(app);
registerListFoodItems(app);
registerDeleteFoodItem(app);
registerCreateFoodItemUnits(app);
registerListFoodItemUnits(app);
registerDeleteFoodItemUnits(app);

// Mount other regular API routes (non-OpenAPI for now)
app.route("/api", api);

// Generate OpenAPI spec (using doc31 for v3.1 with proper schema conversion)
app.doc31("/api/openapi.json", {
    openapi: "3.1.0",
    info: {
        title: "Daily Scheduler API",
        version: "1.0.0",
        description:
            "API for managing todos, habits, meals, recipes, and food items",
    },
    servers: [
        {
            url: "http://localhost:3030",
            description: "Local development server",
        },
        {
            url: "https://api.flowday.io",
            description: "Production server",
        },
    ],
});

// Scalar API Reference (modern, beautiful UI) - PRIMARY DOCS
app.get(
    "/api/docs",
    apiReference({
        spec: {
            url: "/api/openapi.json",
        },
        theme: "purple",
    }),
);

// Swagger UI (classic) - alternative view
app.get("/api/swagger", swaggerUI({ url: "/api/openapi.json" }));

export default {
    port: 3030,
    fetch: app.fetch,
};
