// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { mealRecipes, meals } from "../../../db/schemas";

const mealsTag = "Meals";
const httpGetMethod = "get";
const listMealsPath = "/api/meal";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusUnauthorized = 401;
const mealsRetrievedMessage = "Meals retrieved successfully";
const unauthorizedResponseDescription = "Unauthorized";

// Response schemas
const mealSummarySchema = z.object({
    id: z.string().uuid(),
    mealName: z.string(),
    recipeCount: z.number(),
});

// Route definition
const listMealsRoute = createRoute({
    method: httpGetMethod,
    path: listMealsPath,
    tags: [mealsTag],
    security: [{ Bearer: [] }],
    responses: {
        [httpStatusOk]: {
            description: mealsRetrievedMessage,
            content: {
                [jsonContentType]: {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: z.array(mealSummarySchema),
                    }),
                },
            },
        },
        [httpStatusUnauthorized]: {
            description: unauthorizedResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                    }),
                },
            },
        },
    },
});

export function registerListMeals(app: OpenAPIHono) {
    app.openapi(listMealsRoute, async (c) => {
        const safeUserId = c.userId!;

        const userMeals = await db
            .select()
            .from(meals)
            .where(eq(meals.userId, safeUserId));

        const mealsData = await Promise.all(
            userMeals.map(async (meal) => {
                // Get recipes attached to this meal
                const mealRecipesData = await db
                    .select()
                    .from(mealRecipes)
                    .where(eq(mealRecipes.mealId, meal.id))
                    .orderBy(mealRecipes.orderInMeal);

                return {
                    id: meal.id,
                    mealName: meal.mealName,
                    recipeCount: mealRecipesData.length,
                };
            }),
        );

        return c.json(
            {
                success: true as const,
                message: mealsRetrievedMessage,
                data: mealsData,
            },
            httpStatusOk,
        );
    });
}
