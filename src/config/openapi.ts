import { OpenAPIHono } from "@hono/zod-openapi";

// Create the main OpenAPI app instance
export const createOpenAPIApp = () => {
    return new OpenAPIHono({
        defaultHook: (result, c) => {
            if (!result.success) {
                return c.json(
                    {
                        ok: false,
                        message: "Validation failed",
                        errors: result.error.issues.map((issue) => ({
                            path: issue.path.join("."),
                            message: issue.message,
                            code: issue.code,
                        })),
                    },
                    400,
                );
            }
        },
    });
};

// OpenAPI document configuration
export const openAPIConfig = {
    openapi: "3.0.0",
    info: {
        title: "Daily Scheduler API",
        version: "1.0.0",
        description:
            "A comprehensive API for managing daily schedules, habits, meals, recipes, and todos",
        contact: {
            name: "API Support",
            email: "support@flowday.io",
        },
    },
    servers: [
        {
            url: "https://api.flowday.io",
            description: "Production server",
        },
        {
            url: "http://localhost:3005",
            description: "Development server",
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "JWT token obtained from Clerk authentication",
            },
        },
    },
    security: [
        {
            BearerAuth: [],
        },
    ],
    tags: [
        {
            name: "Habits",
            description: "Operations related to habit management and tracking",
        },
        {
            name: "Meals",
            description: "Operations for meal planning and management",
        },
        {
            name: "Recipes",
            description: "Recipe creation, management, and ingredient handling",
        },
        {
            name: "Food Items",
            description: "Food item catalog and unit management",
        },
        {
            name: "Todos",
            description: "Task and todo item management",
        },
        {
            name: "System",
            description: "System health and utility endpoints",
        },
    ],
};
