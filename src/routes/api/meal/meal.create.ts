import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { type MealCreateType, mealSchema } from "../../../contracts/food/meal";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const createMealRequestSchema = z.object({
    mealName: z
        .string()
        .min(1, "Meal name min length is 1")
        .max(100, "Meal name max length is 100"),
});

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({
        meal: z.object({
            id: z.string().uuid(),
            mealName: z.string(),
        }),
        message: z.string(),
    }),
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

// Route definition
const createMealRoute = createRoute({
    method: "post",
    path: "/api/meal",
    tags: ["Meals"],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createMealRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Meal created successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema,
                },
            },
        },
        400: {
            description: "Bad Request",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
    },
});

export function registerCreateMeal(app: OpenAPIHono) {
    app.openapi(createMealRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeCreateMealJsonBody = c.req.valid("json");

        const newMeal: MealCreateType = {
            id: crypto.randomUUID(),
            userId: safeUserId,
            mealName: safeCreateMealJsonBody.mealName,
        };

        const createMealEvent = mealSchema.safeParse(newMeal);
        if (!createMealEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid meal data",
                    errors: createMealEvent.error.errors,
                },
                400,
            );
        }
        const safeCreateMealEvent = createMealEvent.data;

        try {
            await FlowcorePathways.write("meal.v0/meal.created.v0", {
                data: safeCreateMealEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to create meal",
                    errors: error,
                },
                500,
            );
        }

        const { userId: _, ...createMeal } = safeCreateMealEvent;

        return c.json(
            {
                success: true as const,
                message: "Meal created successfully",
                data: {
                    meal: createMeal,
                    message:
                        "Meal created. Use POST /api/meal/:id/recipes to attach recipes.",
                },
            },
            201,
        );
    });
}
