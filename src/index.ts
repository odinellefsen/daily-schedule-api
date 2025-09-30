import { Hono } from "hono";
import { cors } from "hono/cors";
import api from "./routes/api";

export const app = new Hono();

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

// Mount regular API routes
app.route("/api", api);

export default {
    port: 3030,
    fetch: app.fetch,
};
