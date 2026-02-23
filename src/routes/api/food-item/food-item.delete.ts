// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import {
    type FoodItemDeletedType,
    foodItemDeletedSchema,
} from "../../../contracts/food/food-item/food-item.contract";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const deleteFoodItemRequestSchema = z.object({
    foodItemId: z.string().uuid(),
});

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: foodItemDeletedSchema,
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

// Route definition
const deleteFoodItemRoute = createRoute({
    method: "delete",
    path: "/api/food-item",
    tags: ["Food Items"],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: deleteFoodItemRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Food item deleted successfully",
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
        404: {
            description: "Not Found - Food item does not exist",
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

export function registerDeleteFoodItem(app: OpenAPIHono) {
    app.openapi(deleteFoodItemRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeDeleteFoodItemRequestBody = c.req.valid("json");

        const foodItemFromDb = await db.query.foodItems.findFirst({
            where: and(
                eq(foodItems.id, safeDeleteFoodItemRequestBody.foodItemId),
                eq(foodItems.userId, safeUserId),
            ),
        });

        if (!foodItemFromDb) {
            return c.json(
                {
                    success: false as const,
                    message: "Food item not found",
                },
                404,
            );
        }

        const foodItemDeleted: FoodItemDeletedType = {
            foodItemId: foodItemFromDb.id,
        };

        const foodItemDeletedEvent =
            foodItemDeletedSchema.safeParse(foodItemDeleted);
        if (!foodItemDeletedEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid food item deleted data",
                    errors: foodItemDeletedEvent.error.errors,
                },
                400,
            );
        }
        const safeFoodItemDeletedEvent = foodItemDeletedEvent.data;

        try {
            await FlowcorePathways.write("food-item.v0/food-item.deleted.v0", {
                data: safeFoodItemDeletedEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to delete food item",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Food item deleted successfully",
                data: safeFoodItemDeletedEvent,
            },
            200,
        );
    });
}
