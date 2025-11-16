import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
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
    Scalar({
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
