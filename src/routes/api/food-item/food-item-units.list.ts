// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { foodItems, foodItemUnits } from "../../../db/schemas";

const foodItemUnitsTag = "Food Item Units";
const httpGetMethod = "get";
const listFoodItemUnitsByFoodItemIdPath = "/api/food-item/:foodItemId/units";
const listAllFoodItemUnitsPath = "/api/food-item/units";
const jsonContentType = "application/json";
const foodItemUnitsRetrievedMessage = "Food item units retrieved successfully";
const allFoodItemUnitsRetrievedMessage =
    "All food item units retrieved successfully";
const foodItemNotFoundMessage = "Food item not found or access denied";
const httpStatusOk = 200;
const httpStatusUnauthorized = 401;
const httpStatusNotFound = 404;

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
    method: httpGetMethod,
    path: listFoodItemUnitsByFoodItemIdPath,
    tags: [foodItemUnitsTag],
    security: [{ Bearer: [] }],
    request: {
        params: z.object({
            foodItemId: z.string().uuid(),
        }),
    },
    responses: {
        [httpStatusOk]: {
            description: foodItemUnitsRetrievedMessage,
            content: {
                [jsonContentType]: {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: z.array(foodItemUnitDetailSchema),
                    }),
                },
            },
        },
        [httpStatusUnauthorized]: {
            description: "Unauthorized",
            content: {
                [jsonContentType]: {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                    }),
                },
            },
        },
        [httpStatusNotFound]: {
            description: "Not Found",
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

const listAllFoodItemUnitsRoute = createRoute({
    method: httpGetMethod,
    path: listAllFoodItemUnitsPath,
    tags: [foodItemUnitsTag],
    security: [{ Bearer: [] }],
    responses: {
        [httpStatusOk]: {
            description: allFoodItemUnitsRetrievedMessage,
            content: {
                [jsonContentType]: {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: z.array(allFoodItemUnitsSchema),
                    }),
                },
            },
        },
        [httpStatusUnauthorized]: {
            description: "Unauthorized",
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
                    message: foodItemNotFoundMessage,
                },
                httpStatusNotFound,
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
                message: foodItemUnitsRetrievedMessage,
                data: unitsWithFoodItem,
            },
            httpStatusOk,
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
                message: allFoodItemUnitsRetrievedMessage,
                data: unitsWithFoodItems,
            },
            httpStatusOk,
        );
    });
}
