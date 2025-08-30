import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { createOpenAPIApp, openAPIConfig } from "./config/openapi";
import api from "./routes/api";

// Create the main app with OpenAPI support
export const app = createOpenAPIApp();

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

// Add Swagger UI endpoint
app.get("/docs", swaggerUI({ url: "/openapi.json" }));

// Add OpenAPI spec endpoint
app.doc("/openapi.json", openAPIConfig);

app.route("/api", api);

export default {
    port: 3005,
    fetch: app.fetch,
};
