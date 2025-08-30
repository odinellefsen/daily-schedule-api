export const openApiConfig = {
    openapi: "3.0.0",
    info: {
        version: "1.0.0",
        title: "Daily Scheduler API",
        description:
            "API for managing daily habits, meals, recipes, food items, and todos",
    },
    servers: [
        {
            url: "http://localhost:3005",
            description: "Local development server",
        },
        {
            url: "https://api.flowday.io",
            description: "Production server",
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Enter your Clerk JWT token",
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
};
