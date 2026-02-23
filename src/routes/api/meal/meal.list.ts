// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { mealRecipes, meals } from "../../../db/schemas";

// Response schemas
const mealSummarySchema = z.object({
    id: z.string().uuid(),
    mealName: z.string(),
    recipeCount: z.number(),
});

// Route definition
const listMealsRoute = createRoute({
    method: "get",
    path: "/api/meal",
    tags: ["Meals"],
    security: [{ Bearer: [] }],
    responses: {
        200: {
            description: "Meals retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: z.array(mealSummarySchema),
                    }),
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
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
                message: "Meals retrieved successfully",
                data: mealsData,
            },
            200,
        );
    });
}
