import { Hono } from "hono";
import { cors } from "hono/cors";
import api from "./routes/api";

export const app = new Hono();

// Configure CORS to allow requests from frontend
app.use(
    "/*",
    cors({
        origin: ["http://localhost:3000", "http://localhost:3001"], // Add your frontend URLs
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        credentials: true,
    })
);

app.route("/api", api);

export default {
    port: 3005,
    fetch: app.fetch,
};
