// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { inArray } from "drizzle-orm";
import { foodItemUnitDeletedSchema } from "../../../contracts/food/food-item";
import type { UnitOfMeasurementEnum } from "../../../contracts/food/food-item/food-item.shared_utils";
import { db } from "../../../db";
import { foodItemUnits } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

const foodItemUnitsTag = "Food Item Units";
const httpDeleteMethod = "delete";
const deleteFoodItemUnitsPath = "/api/food-item/:foodItemId/units";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusNotFound = 404;
const httpStatusInternalServerError = 500;
const foodItemUnitsDeletedSuccessDescription =
    "Food item units deleted successfully";
const foodItemUnitsNotFoundMessage = "One or more food item units not found";
const foodItemUnitsSameItemMessage =
    "All units must belong to the same food item";
const invalidFoodItemUnitDataMessage = "Invalid food item unit data";
const failedToDeleteFoodItemUnitsMessage = "Failed to delete food item units";
const foodItemUnitsDeletedMessage = "Food item units deleted";
const foodItemUnitsDeletedEventType = "food-item.v0/food-item.units.deleted.v0";

// Request schema
const deleteFoodItemUnitRequestSchema = z.object({
    unitIds: z.array(z.string().uuid()),
});

// Route definition
const deleteFoodItemUnitsRoute = createRoute({
    method: httpDeleteMethod,
    path: deleteFoodItemUnitsPath,
    tags: [foodItemUnitsTag],
    security: [{ Bearer: [] }],
    request: {
        params: z.object({
            foodItemId: z.string().uuid(),
        }),
        body: {
            content: {
                [jsonContentType]: {
                    schema: deleteFoodItemUnitRequestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusOk]: {
            description: foodItemUnitsDeletedSuccessDescription,
            content: {
                [jsonContentType]: {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: z.string(),
                    }),
                },
            },
        },
        [httpStatusBadRequest]: {
            description: "Bad Request",
            content: {
                [jsonContentType]: {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                        errors: z.any().optional(),
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
        [httpStatusInternalServerError]: {
            description: "Internal Server Error",
            content: {
                [jsonContentType]: {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                        errors: z.any().optional(),
                    }),
                },
            },
        },
    },
});

export function registerDeleteFoodItemUnits(app: OpenAPIHono) {
    app.openapi(deleteFoodItemUnitsRoute, async (c) => {
        const safeDeleteFoodItemUnitRequestBody = c.req.valid("json");

        const foodItemUnitsFromDb = await db.query.foodItemUnits.findMany({
            where: inArray(
                foodItemUnits.id,
                safeDeleteFoodItemUnitRequestBody.unitIds,
            ),
        });

        if (
            foodItemUnitsFromDb.length !==
            safeDeleteFoodItemUnitRequestBody.unitIds.length
        ) {
            return c.json(
                {
                    success: false as const,
                    message: foodItemUnitsNotFoundMessage,
                },
                httpStatusNotFound,
            );
        }

        const uniqueFoodItemIds = new Set(
            foodItemUnitsFromDb.map((unit) => unit.foodItemId),
        );
        if (uniqueFoodItemIds.size !== 1) {
            return c.json(
                {
                    success: false as const,
                    message: foodItemUnitsSameItemMessage,
                },
                httpStatusBadRequest,
            );
        }

        const foodItemId = foodItemUnitsFromDb[0].foodItemId;

        const foodItemArr = foodItemUnitsFromDb.map((unit) => ({
            id: unit.id,
            unitOfMeasurement: unit.unitOfMeasurement as UnitOfMeasurementEnum,
            unitDescription: unit.unitDescription ?? undefined,
            nutritionPerOfThisUnit: {
                calories: unit.calories,
                proteinInGrams: unit.proteinInGrams,
                carbohydratesInGrams: unit.carbohydratesInGrams,
                fatInGrams: unit.fatInGrams,
                fiberInGrams: unit.fiberInGrams,
                sugarInGrams: unit.sugarInGrams,
                sodiumInMilligrams: unit.sodiumInMilligrams,
            },
            source: unit.source as
                | "user_measured"
                | "package_label"
                | "database"
                | "estimated",
        }));

        const newDeleteFoodItemUnitEvent = foodItemUnitDeletedSchema.safeParse({
            foodItemId,
            units: foodItemArr,
        });
        if (!newDeleteFoodItemUnitEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: invalidFoodItemUnitDataMessage,
                    errors: newDeleteFoodItemUnitEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }
        const safeDeleteFoodItemUnitEvent = newDeleteFoodItemUnitEvent.data;

        try {
            await FlowcorePathways.write(foodItemUnitsDeletedEventType, {
                data: safeDeleteFoodItemUnitEvent,
            });
        } catch (error) {
            console.error(error);
            return c.json(
                {
                    success: false as const,
                    message: failedToDeleteFoodItemUnitsMessage,
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: foodItemUnitsDeletedMessage,
                data: foodItemUnitsDeletedSuccessDescription,
            },
            httpStatusOk,
        );
    });
}
