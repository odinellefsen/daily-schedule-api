// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import {
    type FoodItemUnitType,
    foodItemUnitSchema,
} from "../../../contracts/food/food-item/food-item-units.contract";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const createFoodItemUnitRequestSchema = foodItemUnitSchema
    .omit({
        foodItemId: true,
    })
    .extend({
        foodItemName: z.string().min(1, "Food item name min length is 1"),
        units: z.array(
            foodItemUnitSchema.shape.units.element.omit({
                id: true,
                source: true,
            }),
        ),
    });

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: foodItemUnitSchema,
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

// Route definition
const createFoodItemUnitsRoute = createRoute({
    method: "post",
    path: "/food-item/:foodItemId/units",
    tags: ["Food Item Units"],
    security: [{ Bearer: [] }],
    request: {
        params: z.object({
            foodItemId: z.string().uuid(),
        }),
        body: {
            content: {
                "application/json": {
                    schema: createFoodItemUnitRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Food item units created successfully",
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

export function registerCreateFoodItemUnits(app: OpenAPIHono) {
    app.openapi(createFoodItemUnitsRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeCreateFoodItemUnitJsonBody = c.req.valid("json");

        const relatedFoodItem = await db.query.foodItems.findFirst({
            where: and(
                eq(foodItems.name, safeCreateFoodItemUnitJsonBody.foodItemName),
                eq(foodItems.userId, safeUserId),
            ),
        });

        if (!relatedFoodItem) {
            return c.json(
                {
                    success: false as const,
                    message: "Food item does not exist",
                },
                400,
            );
        }

        const newFoodItemUnits: FoodItemUnitType = {
            foodItemId: relatedFoodItem.id,
            units: safeCreateFoodItemUnitJsonBody.units.map((unit) => ({
                id: crypto.randomUUID(),
                ...unit,
                source: "user_measured" as const,
            })),
        };

        const createdFoodItemUnitEvent =
            foodItemUnitSchema.safeParse(newFoodItemUnits);
        if (!createdFoodItemUnitEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid food item unit data",
                    errors: createdFoodItemUnitEvent.error.errors,
                },
                400,
            );
        }
        const safeCreateFoodItemUnitEvent = createdFoodItemUnitEvent.data;

        try {
            await FlowcorePathways.write(
                "food-item.v0/food-item.units.created.v0",
                {
                    data: safeCreateFoodItemUnitEvent,
                },
            );
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to create food item units",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Food item units created successfully",
                data: safeCreateFoodItemUnitEvent,
            },
            200,
        );
    });
}
