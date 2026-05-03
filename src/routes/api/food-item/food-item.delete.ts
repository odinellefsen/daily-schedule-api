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
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const foodItemsTag = "Food Items";
const httpDeleteMethod = "delete";
const deleteFoodItemPath = "/api/food-item";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusNotFound = 404;
const httpStatusInternalServerError = 500;

// Request schema
const deleteFoodItemRequestSchema = z.object({
    foodItemId: z.string().uuid(),
});

// Response schemas
const successResponseSchema = createSuccessResponseSchema(
    foodItemDeletedSchema,
);

// Route definition
const deleteFoodItemRoute = createRoute({
    method: httpDeleteMethod,
    path: deleteFoodItemPath,
    tags: [foodItemsTag],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: deleteFoodItemRequestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusOk]: {
            description: "Food item deleted successfully",
            content: {
                [jsonContentType]: {
                    schema: successResponseSchema,
                },
            },
        },
        [httpStatusBadRequest]: {
            description: "Bad Request",
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusUnauthorized]: {
            description: "Unauthorized",
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusNotFound]: {
            description: "Not Found - Food item does not exist",
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusInternalServerError]: {
            description: "Internal Server Error",
            content: {
                [jsonContentType]: {
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
                httpStatusNotFound,
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
                httpStatusBadRequest,
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
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Food item deleted successfully",
                data: safeFoodItemDeletedEvent,
            },
            httpStatusOk,
        );
    });
}
