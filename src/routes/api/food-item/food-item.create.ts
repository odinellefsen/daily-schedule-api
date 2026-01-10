import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import {
    type FoodItemType,
    foodItemSchema,
} from "../../../contracts/food/food-item";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const createFoodItemRequestSchema = z.object({
    foodItemName: z
        .string()
        .min(1, "Food item name min length is 1")
        .max(100, "Food item name max length is 100"),
    categoryHierarchy: z.array(z.string()).optional(),
});

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: foodItemSchema,
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

// Route definition
const createFoodItemRoute = createRoute({
    method: "post",
    path: "/api/food-item",
    tags: ["Food Items"],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createFoodItemRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Food item created successfully",
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
        409: {
            description: "Conflict - Food item with name already exists",
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
} as const);

export function registerCreateFoodItem(app: OpenAPIHono) {
    app.openapi(createFoodItemRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeCreateFoodItemJsonBody = c.req.valid("json");

        const existingFoodItem = await db
            .select()
            .from(foodItems)
            .where(
                and(
                    eq(foodItems.name, safeCreateFoodItemJsonBody.foodItemName),
                    eq(foodItems.userId, safeUserId),
                ),
            );
        if (existingFoodItem.length > 0) {
            return c.json(
                {
                    success: false as const,
                    message: "Food item with name already exists",
                },
                409,
            );
        }

        const newFoodItem: FoodItemType = {
            id: crypto.randomUUID(),
            userId: safeUserId,
            name: safeCreateFoodItemJsonBody.foodItemName,
            categoryHierarchy: safeCreateFoodItemJsonBody.categoryHierarchy,
        };

        const createFoodItemEvent = foodItemSchema.safeParse(newFoodItem);
        if (!createFoodItemEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid food item data",
                    errors: createFoodItemEvent.error.errors,
                },
                400,
            );
        }
        const safeCreateFoodItemEvent = createFoodItemEvent.data;

        try {
            await FlowcorePathways.write("food-item.v0/food-item.created.v0", {
                data: safeCreateFoodItemEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to create food item",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Food item created successfully",
                data: safeCreateFoodItemEvent,
            },
            200,
        );
    });
}
