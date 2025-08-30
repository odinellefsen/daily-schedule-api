import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type FoodItemUnitType,
    type FoodItemUnitUpdatedType,
    foodItemUnitSchema,
    foodItemUnitUpdatedSchema,
} from "../../../contracts/food/food-item";
import type { UnitOfMeasurementEnum } from "../../../contracts/food/food-item/food-item.shared_utils";
import { db } from "../../../db";
import { foodItems, foodItemUnits } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const updateFoodItemUnitRequestSchema = foodItemUnitSchema
    .omit({
        foodItemId: true,
    })
    .extend({
        foodItemName: z.string().min(1, "Food item name min length is 1"),
    });

export function registerPatchFoodItemUnits(app: Hono) {
    app.patch("/:foodItemId/units", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBodyRequest = await c.req.json();
        const parsedJsonBodyRequest =
            updateFoodItemUnitRequestSchema.safeParse(rawJsonBodyRequest);
        if (!parsedJsonBodyRequest.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid food item unit data",
                    parsedJsonBodyRequest.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeUpdateFoodItemUnitJsonBody = parsedJsonBodyRequest.data;

        const relatedFoodItem = await db.query.foodItems.findFirst({
            where: and(
                eq(foodItems.name, safeUpdateFoodItemUnitJsonBody.foodItemName),
                eq(foodItems.userId, safeUserId),
            ),
        });

        if (!relatedFoodItem) {
            return c.json(
                ApiResponse.error("Food item does not exist"),
                StatusCodes.BAD_REQUEST,
            );
        }

        const relatedFoodItemUnits = await db
            .select()
            .from(foodItemUnits)
            .where(eq(foodItemUnits.foodItemId, relatedFoodItem.id));

        if (!relatedFoodItemUnits) {
            return c.json(
                ApiResponse.error("Food item units do not exist"),
                StatusCodes.BAD_REQUEST,
            );
        }

        const oldUnitFieldValues: FoodItemUnitType["units"] =
            relatedFoodItemUnits.map((unit) => ({
                id: unit.id,
                nutritionPerOfThisUnit: {
                    calories: unit.calories,
                    proteinInGrams: unit.proteinInGrams ?? undefined,
                    fatInGrams: unit.fatInGrams ?? undefined,
                    carbohydratesInGrams:
                        unit.carbohydratesInGrams ?? undefined,
                    fiberInGrams: unit.fiberInGrams ?? undefined,
                    sugarInGrams: unit.sugarInGrams ?? undefined,
                    sodiumInMilligrams: unit.sodiumInMilligrams ?? undefined,
                },
                unitOfMeasurement:
                    unit.unitOfMeasurement as UnitOfMeasurementEnum,
                unitDescription: unit.unitDescription ?? undefined,
                source: unit.source as
                    | "user_measured"
                    | "package_label"
                    | "database"
                    | "estimated",
            }));

        const updatedFoodItemUnits: FoodItemUnitUpdatedType = {
            foodItemId: relatedFoodItem.id,
            units: safeUpdateFoodItemUnitJsonBody.units.map((unit) => ({
                ...unit,
            })),
            oldValues: {
                foodItemId: relatedFoodItem.id,
                units: oldUnitFieldValues.map((unit) => ({
                    id: unit.id,
                    unitOfMeasurement: unit.unitOfMeasurement,
                    unitDescription: unit.unitDescription ?? undefined,
                    source: unit.source,
                    nutritionPerOfThisUnit: {
                        calories: unit.nutritionPerOfThisUnit.calories,
                        proteinInGrams:
                            unit.nutritionPerOfThisUnit.proteinInGrams,
                        fatInGrams: unit.nutritionPerOfThisUnit.fatInGrams,
                        carbohydratesInGrams:
                            unit.nutritionPerOfThisUnit.carbohydratesInGrams,
                        fiberInGrams: unit.nutritionPerOfThisUnit.fiberInGrams,
                        sugarInGrams: unit.nutritionPerOfThisUnit.sugarInGrams,
                        sodiumInMilligrams:
                            unit.nutritionPerOfThisUnit.sodiumInMilligrams,
                    },
                })),
            },
        };
        const updatedFoodItemUnitEvent =
            foodItemUnitUpdatedSchema.safeParse(updatedFoodItemUnits);
        if (!updatedFoodItemUnitEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid food item unit data",
                    updatedFoodItemUnitEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeUpdatedFoodItemUnitEvent = updatedFoodItemUnitEvent.data;

        try {
            await FlowcorePathways.write(
                "food-item.v0/food-item.units.updated.v0",
                {
                    data: safeUpdatedFoodItemUnitEvent,
                },
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to create food item units", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Food item units updated successfully",
                safeUpdatedFoodItemUnitEvent,
            ),
        );
    });
}
