import { OpenAPIHono } from "@hono/zod-openapi";
import type { Handler, Hono } from "hono";
import { cors } from "hono/cors";
import { zodEnv } from "../env";
import api from "./routes/api";

export const app = new OpenAPIHono();
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

const localApiHost = localApiUrl?.hostname;
const localApiPort = Number(localApiUrl?.port || "3030");

app.use(
    "/*",
    cors({
        origin: allowedOrigins,
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        maxAge: 86400,
        credentials: true,
    }),
);

// Unauthenticated health check (for load balancers / k8s / uptime monitors)
app.get("/health", (c) => {
    return c.json({ ok: true }, 200);
});

// Convenience alias under /api (also unauthenticated)
app.get("/api/health", (c) => {
    return c.json({ ok: true }, 200);
});

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
import { registerCreateHabit } from "./routes/api/habit/habit.create";
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

// Apply auth middleware
app.use("/api/todo/*", requireAuth());
app.use("/api/food-item/*", requireAuth());
app.use("/api/habit/*", requireAuth());
app.use("/api/recipe/*", requireAuth());
app.use("/api/meal/*", requireAuth());

// Register OpenAPI routes directly on main app
registerCreateTodo(app);
registerCancelTodo(app);
registerCompleteTodo(app);
registerListTodos(app);
registerCreateFoodItem(app);
registerListFoodItems(app);
registerDeleteFoodItem(app);
registerCreateFoodItemUnits(app);
registerListFoodItemUnits(app);
registerDeleteFoodItemUnits(app);
registerCreateHabit(app);
registerCreateRecipe(app);
registerDeleteRecipe(app);
registerListRecipes(app);
registerCreateRecipeIngredients(app);
registerCreateRecipeInstructions(app);
registerCreateMeal(app);
registerListMeals(app);
registerGetMeal(app);
registerAttachMealRecipes(app);

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
app.get("/api/swagger", async (c, next) => {
    const handler = await getScalarHandler();
    return handler(c, next);
});

const serverConfig: {
    port: number;
    fetch: typeof app.fetch;
    hostname?: string;
} = {
    port: localApiPort,
    fetch: app.fetch,
};

if (localApiHost) {
    serverConfig.hostname = localApiHost;
}

export default serverConfig;
