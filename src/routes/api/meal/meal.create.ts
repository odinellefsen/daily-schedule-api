// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { type MealCreateType, mealSchema } from "../../../contracts/food/meal";
import { FlowcorePathways } from "../../../utils/flowcore";
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const mealsTag = "Meals";
const httpPostMethod = "post";
const createMealPath = "/api/meal";
const jsonContentType = "application/json";
const httpStatusCreated = 201;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusInternalServerError = 500;
const mealCreatedSuccessMessage = "Meal created successfully";
const invalidMealDataMessage = "Invalid meal data";
const failedToCreateMealMessage = "Failed to create meal";
const mealCreatedFollowUpMessage =
    "Meal created. Use POST /api/meal/:id/recipes to attach recipes.";
const mealCreatedEventType = "meal.v0/meal.created.v0";
const badRequestResponseDescription = "Bad Request";
const unauthorizedResponseDescription = "Unauthorized";
const internalServerErrorResponseDescription = "Internal Server Error";

// Request schema
const createMealRequestSchema = z.object({
    mealName: z
        .string()
        .min(1, "Meal name min length is 1")
        .max(100, "Meal name max length is 100"),
});

// Response schemas
const successResponseSchema = createSuccessResponseSchema(
    z.object({
        meal: z.object({
            id: z.string().uuid(),
            mealName: z.string(),
        }),
        message: z.string(),
    }),
);

// Route definition
const createMealRoute = createRoute({
    method: httpPostMethod,
    path: createMealPath,
    tags: [mealsTag],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: createMealRequestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusCreated]: {
            description: mealCreatedSuccessMessage,
            content: {
                [jsonContentType]: {
                    schema: successResponseSchema,
                },
            },
        },
        [httpStatusBadRequest]: {
            description: badRequestResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusUnauthorized]: {
            description: unauthorizedResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusInternalServerError]: {
            description: internalServerErrorResponseDescription,
            content: {
                [jsonContentType]: {
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
                    message: invalidMealDataMessage,
                    errors: createMealEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }
        const safeCreateMealEvent = createMealEvent.data;

        try {
            await FlowcorePathways.write(mealCreatedEventType, {
                data: safeCreateMealEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: failedToCreateMealMessage,
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        const { userId: _, ...createMeal } = safeCreateMealEvent;

        return c.json(
            {
                success: true as const,
                message: mealCreatedSuccessMessage,
                data: {
                    meal: createMeal,
                    message: mealCreatedFollowUpMessage,
                },
            },
            httpStatusCreated,
        );
    });
}
