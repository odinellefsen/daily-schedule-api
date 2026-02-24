import { OpenAPIHono } from "@hono/zod-openapi";
import { type Handler, Hono } from "hono";
import { cors } from "hono/cors";
import { zodEnv } from "../env";
import api from "./routes/api";

const openApiApp = new OpenAPIHono();
export const app = new Hono();
// Exporting this type also ensures the module has a direct `from "hono"` import,
// which some deployment/build detectors rely on.
export type App = Hono;

app.onError((err, c) => {
    console.error("Unhandled error", err);
    return c.json(
        {
            error: "INTERNAL_SERVER_ERROR",
            message: err instanceof Error ? err.message : String(err),
        },
        500,
    );
});

// Configure server binding and CORS for local frontend
const defaultLocalApiBaseUrl = "http://localhost:3030";
const rawLocalApiBaseUrl = zodEnv.LOCAL_IP ?? defaultLocalApiBaseUrl;
const localApiBaseUrl = rawLocalApiBaseUrl.includes("://")
    ? rawLocalApiBaseUrl
    : `http://${rawLocalApiBaseUrl}`;
let localApiUrl: URL | undefined;

try {
    localApiUrl = new URL(localApiBaseUrl);
} catch {
    localApiUrl = new URL(defaultLocalApiBaseUrl);
}

const defaultAllowedOrigins = ["https://flowday.io", "https://www.flowday.io"];
const localFrontendOrigins = localApiUrl
    ? (["3000", "3001"] as const).map((port) => {
          const protocol = localApiUrl?.protocol ?? "http:";
          const hostname = localApiUrl?.hostname ?? "localhost";
          return `${protocol}//${hostname}:${port}`;
      })
    : ["http://localhost:3000", "http://localhost:3001"];

const allowedOrigins = Array.from(
    new Set([...defaultAllowedOrigins, ...localFrontendOrigins]),
);

app.use(
    "/*",
    cors({
        origin: (origin) => {
            if (!origin) return "";
            if (allowedOrigins.includes(origin)) return origin;

            // Allow trusted Flowday subdomains and Vercel previews.
            try {
                const { hostname, protocol } = new URL(origin);
                if (
                    protocol === "https:" &&
                    (hostname.endsWith(".flowday.io") ||
                        hostname.endsWith(".vercel.app"))
                ) {
                    return origin;
                }
            } catch {
                return "";
            }

            return "";
        },
        allowHeaders: [
            "Content-Type",
            "Authorization",
            "X-Timezone",
            "X-Secret",
            "baggage",
            "sentry-trace",
        ],
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        maxAge: 86400,
        credentials: true,
    }),
);

// Unauthenticated health check (for load balancers / k8s / uptime monitors)
app.get("/health", (c) => {
    return c.json({ ok: true }, 200);
});

// Register security schemes
openApiApp.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
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
import { registerCreateHabit } from "./routes/api/habit/habit.create";
import { registerDeleteHabit } from "./routes/api/habit/habit.delete";
import { registerCreateMeal } from "./routes/api/meal/meal.create";
import { registerGetMeal } from "./routes/api/meal/meal.get";
import { registerListMeals } from "./routes/api/meal/meal.list";
import { registerAttachMealRecipes } from "./routes/api/meal/meal-recipes.attach";
import { registerCreateRecipe } from "./routes/api/recipe/recipe.create";
import { registerDeleteRecipe } from "./routes/api/recipe/recipe.delete";
import { registerListRecipes } from "./routes/api/recipe/recipe.list";
import { registerCreateRecipeIngredients } from "./routes/api/recipe/recipe-ingredients.create";
import { registerCreateRecipeInstructions } from "./routes/api/recipe/recipe-instructions.create";
import { registerCancelTodo } from "./routes/api/todo/todo.cancel";
import { registerCompleteTodo } from "./routes/api/todo/todo.complete";
import { registerCreateTodo } from "./routes/api/todo/todo.create";
import { registerListTodos } from "./routes/api/todo/todo.list";

// Apply auth middleware once for protected API groups.
const protectedApiBasePaths = [
    "/api/todo",
    "/api/food-item",
    "/api/habit",
    "/api/recipe",
    "/api/meal",
] as const;
const authMiddleware = requireAuth();

openApiApp.use("/api/*", async (c, next) => {
    const isProtectedPath = protectedApiBasePaths.some(
        (basePath) =>
            c.req.path === basePath || c.req.path.startsWith(`${basePath}/`),
    );

    if (!isProtectedPath) {
        await next();
        return;
    }

    return authMiddleware(c, next);
});

// Register OpenAPI routes directly on main app
registerCreateTodo(openApiApp);
registerCancelTodo(openApiApp);
registerCompleteTodo(openApiApp);
registerListTodos(openApiApp);
registerCreateFoodItem(openApiApp);
registerListFoodItems(openApiApp);
registerDeleteFoodItem(openApiApp);
registerCreateFoodItemUnits(openApiApp);
registerListFoodItemUnits(openApiApp);
registerDeleteFoodItemUnits(openApiApp);
registerCreateHabit(openApiApp);
registerDeleteHabit(openApiApp);
registerCreateRecipe(openApiApp);
registerDeleteRecipe(openApiApp);
registerListRecipes(openApiApp);
registerCreateRecipeIngredients(openApiApp);
registerCreateRecipeInstructions(openApiApp);
registerCreateMeal(openApiApp);
registerListMeals(openApiApp);
registerGetMeal(openApiApp);
registerAttachMealRecipes(openApiApp);

// Mount other regular API routes (non-OpenAPI for now)
openApiApp.route("/api", api);

// Generate OpenAPI spec (using doc31 for v3.1 with proper schema conversion)
openApiApp.doc31("/api/openapi.json", {
    openapi: "3.1.0",
    info: {
        title: "Daily Scheduler API",
        version: "1.0.0",
        description:
            "API for managing todos, habits, meals, recipes, and food items",
    },
    servers: [
        {
            url: localApiUrl?.origin ?? defaultLocalApiBaseUrl,
            description: "Local development server",
        },
        {
            url: "https://api.flowday.io",
            description: "Production server",
        },
    ],
});

type ScalarHandler = Handler;
let scalarHandler: ScalarHandler | undefined;
let scalarHandlerInit: Promise<ScalarHandler> | undefined;

async function getScalarHandler(): Promise<ScalarHandler> {
    if (scalarHandler) return scalarHandler;

    // Important: `@scalar/hono-api-reference` is ESM-only. Our Vercel build targets CJS,
    // so we must use a dynamic `import()` to avoid `ERR_REQUIRE_ESM`.
    scalarHandlerInit ??= import("@scalar/hono-api-reference").then(
        ({ Scalar }) => {
            scalarHandler = Scalar({
                url: "/api/openapi.json",
                theme: "purple",
            }) as ScalarHandler;
            return scalarHandler;
        },
    );

    return scalarHandlerInit;
}

// Scalar API Reference (modern, beautiful UI)
openApiApp.get("/api/swagger", async (c, next) => {
    const handler = await getScalarHandler();
    return handler(c, next);
});

app.route("/", openApiApp);
export default app;
