import { inArray } from "drizzle-orm";
import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { foodItemUnitDeletedSchema } from "../../../contracts/food/food-item";
import type { UnitOfMeasurementEnum } from "../../../contracts/food/food-item/food-item.shared_utils";
import { db } from "../../../db";
import { foodItemUnits } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const deleteFoodItemUnitRequestSchema = z.object({
    unitIds: z.array(z.string().uuid()),
});

// Route definition
const deleteFoodItemUnitsRoute = createRoute({
    method: "delete",
    path: "/api/food-item/:foodItemId/units",
    tags: ["Food Item Units"],
    security: [{ Bearer: [] }],
    request: {
        params: z.object({
            foodItemId: z.string().uuid(),
        }),
        body: {
            content: {
                "application/json": {
                    schema: deleteFoodItemUnitRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Food item units deleted successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: z.string(),
                    }),
                },
            },
        },
        400: {
            description: "Bad Request",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(false),
                        message: z.string(),
                        errors: z.any().optional(),
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
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
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
                    message: "One or more food item units not found",
                },
                404,
            );
        }

        const uniqueFoodItemIds = new Set(
            foodItemUnitsFromDb.map((unit) => unit.foodItemId),
        );
        if (uniqueFoodItemIds.size !== 1) {
            return c.json(
                {
                    success: false as const,
                    message: "All units must belong to the same food item",
                },
                400,
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
                    message: "Invalid food item unit data",
                    errors: newDeleteFoodItemUnitEvent.error.errors,
                },
                400,
            );
        }
        const safeDeleteFoodItemUnitEvent = newDeleteFoodItemUnitEvent.data;

        try {
            await FlowcorePathways.write(
                "food-item.v0/food-item.units.deleted.v0",
                {
                    data: safeDeleteFoodItemUnitEvent,
                },
            );
        } catch (error) {
            console.error(error);
            return c.json(
                {
                    success: false as const,
                    message: "Failed to delete food item units",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Food item units deleted",
                data: "Food item units deleted successfully",
            },
            200,
        );
    });
}
