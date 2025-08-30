import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { openApiConfig } from "./openapi/config";
import { registerOpenAPIRoutes } from "./openapi/routes";
import api from "./routes/api";

export const app = new Hono();
export const openApiApp = new OpenAPIHono();

// Configure CORS to allow requests from frontend
app.use(
    "/*",
    cors({
        origin: ["https://flowday.io", "https://www.flowday.io"],
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        maxAge: 86400,
        credentials: true,
    }),
);

// Configure CORS for OpenAPI app as well
openApiApp.use(
    "/*",
    cors({
        origin: ["https://flowday.io", "https://www.flowday.io"],
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        maxAge: 86400,
        credentials: true,
    }),
);

// Mount regular API routes
app.route("/api", api);

// Register OpenAPI routes
registerOpenAPIRoutes(openApiApp);

// Generate OpenAPI documentation endpoint (must be after route registration)
openApiApp.doc("/doc", openApiConfig);

// Mount OpenAPI routes with documentation
app.route("/api/v1", openApiApp);

// Add Swagger UI at /docs
app.get("/docs", swaggerUI({ url: "/api/v1/doc" }));

export default {
    port: 3005,
    fetch: app.fetch,
};
