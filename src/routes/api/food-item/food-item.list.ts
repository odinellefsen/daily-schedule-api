// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { foodItems, foodItemUnits } from "../../../db/schemas";

const foodItemsTag = "Food Items";
const httpGetMethod = "get";
const listFoodItemsPath = "/api/food-item";
const searchFoodItemsPath = "/api/food-item/search";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusUnauthorized = 401;
const unauthorizedResponseDescription = "Unauthorized";
const foodItemsRetrievedMessage = "Food items retrieved successfully";
const foodItemsSearchResultsMessage = "Food items search results";

// Response schemas
const foodItemWithUnitsSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    categoryHierarchy: z.array(z.string()).nullable(),
    unitCount: z.number(),
    hasUnits: z.boolean(),
});

const foodItemBasicSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    categoryHierarchy: z.array(z.string()).nullable(),
});

const listFoodItemsResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.array(foodItemWithUnitsSchema),
});

const searchFoodItemsResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.array(foodItemBasicSchema),
});

// Route definitions
const listFoodItemsRoute = createRoute({
    method: httpGetMethod,
    path: listFoodItemsPath,
    tags: [foodItemsTag],
    security: [{ Bearer: [] }],
    responses: {
        [httpStatusOk]: {
            description: foodItemsRetrievedMessage,
            content: {
                [jsonContentType]: {
                    schema: listFoodItemsResponseSchema,
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

const searchFoodItemsRoute = createRoute({
    method: httpGetMethod,
    path: searchFoodItemsPath,
    tags: [foodItemsTag],
    security: [{ Bearer: [] }],
    request: {
        query: z.object({
            q: z.string().optional(),
        }),
    },
    responses: {
        [httpStatusOk]: {
            description: foodItemsSearchResultsMessage,
            content: {
                [jsonContentType]: {
                    schema: searchFoodItemsResponseSchema,
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

export function registerListFoodItems(app: OpenAPIHono) {
    app.openapi(listFoodItemsRoute, async (c) => {
        const safeUserId = c.userId!;

        const userFoodItems = await db
            .select()
            .from(foodItems)
            .where(eq(foodItems.userId, safeUserId))
            .orderBy(foodItems.name);

        // Get unit counts for each food item
        const foodItemsWithUnitCounts = await Promise.all(
            userFoodItems.map(async (item) => {
                const units = await db
                    .select()
                    .from(foodItemUnits)
                    .where(eq(foodItemUnits.foodItemId, item.id));

                return {
                    id: item.id,
                    name: item.name,
                    categoryHierarchy: item.categoryHierarchy,
                    unitCount: units.length,
                    hasUnits: units.length > 0,
                };
            }),
        );

        return c.json(
            {
                success: true as const,
                message: foodItemsRetrievedMessage,
                data: foodItemsWithUnitCounts,
            },
            httpStatusOk,
        );
    });

    app.openapi(searchFoodItemsRoute, async (c) => {
        const safeUserId = c.userId!;
        const query = c.req.query("q") || "";

        const dbQuery = db
            .select()
            .from(foodItems)
            .where(eq(foodItems.userId, safeUserId));

        // Simple search by name (in a real app, you'd want full-text search)
        if (query) {
            // Note: This is a simplified search - in production you'd want proper full-text search
            const searchResults = await dbQuery;
            const filtered = searchResults.filter((item) =>
                item.name.toLowerCase().includes(query.toLowerCase()),
            );

            return c.json(
                {
                    success: true as const,
                    message: foodItemsSearchResultsMessage,
                    data: filtered,
                },
                httpStatusOk,
            );
        }

        const results = await dbQuery.orderBy(foodItems.name);

        return c.json(
            {
                success: true as const,
                message: foodItemsRetrievedMessage,
                data: results,
            },
            httpStatusOk,
        );
    });
}
