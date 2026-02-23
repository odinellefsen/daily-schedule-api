// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { foodItems, foodItemUnits } from "../../../db/schemas";

// Response schemas
const foodItemUnitDetailSchema = z.object({
    id: z.string().uuid(),
    foodItemId: z.string().uuid(),
    foodItemName: z.string(),
    unitOfMeasurement: z.string(),
    unitDescription: z.string().nullable(),
    calories: z.number(),
    proteinInGrams: z.number().nullable(),
    carbohydratesInGrams: z.number().nullable(),
    fatInGrams: z.number().nullable(),
    fiberInGrams: z.number().nullable(),
    sugarInGrams: z.number().nullable(),
});

const allFoodItemUnitsSchema = z.object({
    unitId: z.string().uuid(),
    unitOfMeasurement: z.string(),
    unitDescription: z.string().nullable(),
    calories: z.number(),
    proteinInGrams: z.number().nullable(),
    carbohydratesInGrams: z.number().nullable(),
    fatInGrams: z.number().nullable(),
    fiberInGrams: z.number().nullable(),
    sugarInGrams: z.number().nullable(),
    foodItemId: z.string().uuid(),
    foodItemName: z.string(),
    categoryHierarchy: z.array(z.string()).nullable(),
});

// Route definitions
const listFoodItemUnitsByFoodItemIdRoute = createRoute({
    method: "get",
    path: "/food-item/:foodItemId/units",
    tags: ["Food Item Units"],
    security: [{ Bearer: [] }],
    request: {
        params: z.object({
            foodItemId: z.string().uuid(),
        }),
    },
    responses: {
        200: {
            description: "Food item units retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: z.array(foodItemUnitDetailSchema),
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
        404: {
            description: "Not Found",
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

const listAllFoodItemUnitsRoute = createRoute({
    method: "get",
    path: "/food-item/units",
    tags: ["Food Item Units"],
    security: [{ Bearer: [] }],
    responses: {
        200: {
            description: "All food item units retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: z.array(allFoodItemUnitsSchema),
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

export function registerListFoodItemUnits(app: OpenAPIHono) {
    app.openapi(listFoodItemUnitsByFoodItemIdRoute, async (c) => {
        const safeUserId = c.userId!;
        const foodItemId = c.req.param("foodItemId");

        // Verify food item exists and belongs to user
        const foodItemFromDb = await db.query.foodItems.findFirst({
            where: and(
                eq(foodItems.id, foodItemId),
                eq(foodItems.userId, safeUserId),
            ),
        });

        if (!foodItemFromDb) {
            return c.json(
                {
                    success: false as const,
                    message: "Food item not found or access denied",
                },
                404,
            );
        }

        const units = await db
            .select()
            .from(foodItemUnits)
            .where(eq(foodItemUnits.foodItemId, foodItemId))
            .orderBy(foodItemUnits.unitOfMeasurement);

        const unitsWithFoodItem = units.map((unit) => ({
            id: unit.id,
            foodItemId: unit.foodItemId,
            foodItemName: foodItemFromDb.name,
            unitOfMeasurement: unit.unitOfMeasurement,
            unitDescription: unit.unitDescription,
            calories: unit.calories,
            proteinInGrams: unit.proteinInGrams,
            carbohydratesInGrams: unit.carbohydratesInGrams,
            fatInGrams: unit.fatInGrams,
            fiberInGrams: unit.fiberInGrams,
            sugarInGrams: unit.sugarInGrams,
        }));

        return c.json(
            {
                success: true as const,
                message: "Food item units retrieved successfully",
                data: unitsWithFoodItem,
            },
            200,
        );
    });

    app.openapi(listAllFoodItemUnitsRoute, async (c) => {
        const safeUserId = c.userId!;

        // Get all units for all user's food items
        const unitsWithFoodItems = await db
            .select({
                unitId: foodItemUnits.id,
                unitOfMeasurement: foodItemUnits.unitOfMeasurement,
                unitDescription: foodItemUnits.unitDescription,
                calories: foodItemUnits.calories,
                proteinInGrams: foodItemUnits.proteinInGrams,
                carbohydratesInGrams: foodItemUnits.carbohydratesInGrams,
                fatInGrams: foodItemUnits.fatInGrams,
                fiberInGrams: foodItemUnits.fiberInGrams,
                sugarInGrams: foodItemUnits.sugarInGrams,
                foodItemId: foodItems.id,
                foodItemName: foodItems.name,
                categoryHierarchy: foodItems.categoryHierarchy,
            })
            .from(foodItemUnits)
            .innerJoin(foodItems, eq(foodItemUnits.foodItemId, foodItems.id))
            .where(eq(foodItems.userId, safeUserId))
            .orderBy(foodItems.name, foodItemUnits.unitOfMeasurement);

        return c.json(
            {
                success: true as const,
                message: "All food item units retrieved successfully",
                data: unitsWithFoodItems,
            },
            200,
        );
    });
}
