import { inArray } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import { foodItemUnitDeletedSchema } from "../../../contracts/food/food-item";
import type { UnitOfMeasurementEnum } from "../../../contracts/food/food-item/food-item.shared_utils";
import { db } from "../../../db";
import { foodItemUnits } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const deleteFoodItemUnitRequestSchema = z.object({
    unitIds: z.array(z.string().uuid()),
});

export function registerDeleteFoodItemUnits(app: Hono) {
    app.delete("/:foodItemId/units", async (c) => {
        const rawJsonBodyRequest = await c.req.json();
        const parsedJsonBodyRequest =
            deleteFoodItemUnitRequestSchema.safeParse(rawJsonBodyRequest);
        if (!parsedJsonBodyRequest.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid food item unit data",
                    parsedJsonBodyRequest.error.errors
                ),
                StatusCodes.BAD_REQUEST
            );
        }
        const safeDeleteFoodItemUnitRequestBody = parsedJsonBodyRequest.data;

        const foodItemUnitsFromDb = await db.query.foodItemUnits.findMany({
            where: inArray(
                foodItemUnits.id,
                safeDeleteFoodItemUnitRequestBody.unitIds
            ),
        });

        if (
            foodItemUnitsFromDb.length !==
            safeDeleteFoodItemUnitRequestBody.unitIds.length
        ) {
            return c.json(
                ApiResponse.error("One or more food item units not found"),
                StatusCodes.NOT_FOUND
            );
        }

        const uniqueFoodItemIds = new Set(
            foodItemUnitsFromDb.map((unit) => unit.foodItemId)
        );
        if (uniqueFoodItemIds.size !== 1) {
            return c.json(
                ApiResponse.error(
                    "All units must belong to the same food item"
                ),
                StatusCodes.BAD_REQUEST
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
                ApiResponse.error(
                    "Invalid food item unit data",
                    newDeleteFoodItemUnitEvent.error.errors
                ),
                StatusCodes.BAD_REQUEST
            );
        }
        const safeDeleteFoodItemUnitEvent = newDeleteFoodItemUnitEvent.data;

        try {
            await FlowcorePathways.write(
                "food-item.v0/food-item.units.deleted.v0",
                {
                    data: safeDeleteFoodItemUnitEvent,
                }
            );
        } catch (error) {
            console.error(error);
            return c.json(
                ApiResponse.error("Failed to delete food item units"),
                StatusCodes.SERVER_ERROR
            );
        }

        return c.json(ApiResponse.success("Food item units deleted"));
    });
}
