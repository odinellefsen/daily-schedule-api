import { and, eq } from "drizzle-orm";
import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import {
    type FoodItemArchivedType,
    foodItemArchivedSchema,
} from "../../../contracts/food/food-item/food-item.contract";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const deleteFoodItemRequestSchema = z.object({
    foodItemName: z
        .string()
        .min(1, "Food item name min length is 1")
        .max(100, "Food item name max length is 100"),
});

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: foodItemArchivedSchema,
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
            description: "Food item archived successfully",
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
                eq(foodItems.name, safeDeleteFoodItemRequestBody.foodItemName),
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

        const foodItemArchived: FoodItemArchivedType = {
            id: foodItemFromDb.id,
            userId: safeUserId,
            name: foodItemFromDb.name,
            // Convert database string back to array format for contract
            categoryHierarchy: foodItemFromDb.categoryHierarchy
                ? foodItemFromDb.categoryHierarchy
                : undefined,
            reasonForArchiving: "User requested deletion",
        };

        const foodItemArchivedEvent =
            foodItemArchivedSchema.safeParse(foodItemArchived);
        if (!foodItemArchivedEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid food item archived data",
                    errors: foodItemArchivedEvent.error.errors,
                },
                400,
            );
        }
        const safeFoodItemArchivedEvent = foodItemArchivedEvent.data;

        try {
            await FlowcorePathways.write("food-item.v0/food-item.archived.v0", {
                data: safeFoodItemArchivedEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to archive food item",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Food item archived successfully",
                data: safeFoodItemArchivedEvent,
            },
            200,
        );
    });
}
