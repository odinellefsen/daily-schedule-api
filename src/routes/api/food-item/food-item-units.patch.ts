import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    type FoodItemUnitUpdatedType,
    foodItemUnitSchema,
    foodItemUnitUpdatedSchema,
} from "../../../contracts/food/food-item";
import type { UnitOfMeasurementEnum } from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { foodItems, foodItemUnits } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import foodItem from "./food-item.create";

// client side request schema
const updateFoodItemUnitRequestSchema = foodItemUnitSchema
    .omit({
        foodItemId: true,
    })
    .extend({
        foodItemName: z.string().min(1, "Food item name min length is 1"),
        units: z.array(
            foodItemUnitSchema.shape.units.element.omit({
                id: true,
                source: true,
            })
        ),
    });

foodItem.patch("/:foodItemId/units", async (c) => {
    const safeUserId = c.userId!;

    const rawJsonBodyRequest = await c.req.json();
    const parsedJsonBodyRequest =
        updateFoodItemUnitRequestSchema.safeParse(rawJsonBodyRequest);
    if (!parsedJsonBodyRequest.success) {
        return c.json(
            ApiResponse.error(
                "Invalid food item unit data",
                parsedJsonBodyRequest.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUpdateFoodItemUnitJsonBody = parsedJsonBodyRequest.data;

    const relatedFoodItem = await db.query.foodItems.findFirst({
        where: and(
            eq(foodItems.name, safeUpdateFoodItemUnitJsonBody.foodItemName),
            eq(foodItems.userId, safeUserId)
        ),
    });

    if (!relatedFoodItem) {
        return c.json(
            ApiResponse.error("Food item does not exist"),
            StatusCodes.BAD_REQUEST
        );
    }

    const relatedFoodItemUnits = await db
        .select()
        .from(foodItemUnits)
        .where(eq(foodItemUnits.foodItemId, relatedFoodItem.id));

    const oldUnitFieldValues = relatedFoodItemUnits.map((unit) => ({
        id: unit.id,
        nutritionPerOfThisUnit: {
            calories: unit.calories,
            proteinInGrams: unit.proteinInGrams,
            fatInGrams: unit.fatInGrams,
            carbohydratesInGrams: unit.carbohydratesInGrams,
            fiberInGrams: unit.fiberInGrams,
            sugarInGrams: unit.sugarInGrams,
            sodiumInMilligrams: unit.sodiumInMilligrams,
        },
        unitOfMeasurement: unit.unitOfMeasurement as UnitOfMeasurementEnum,
        unitDescription: unit.unitDescription,
        source: unit.source,
    }));

    if (!relatedFoodItemUnits) {
        return c.json(
            ApiResponse.error("Food item units do not exist"),
            StatusCodes.BAD_REQUEST
        );
    }

    const updatedFoodItemUnits: FoodItemUnitUpdatedType = {
        foodItemId: relatedFoodItem.id,
        units: safeUpdateFoodItemUnitJsonBody.units.map((unit) => ({
            id: crypto.randomUUID(),
            ...unit,
            source: "user_measured" as const,
        })),
        oldValues: {
            foodItemId: relatedFoodItem.id,
            units: oldUnitFieldValues.map((unit) => ({
                id: unit.id,
                unitOfMeasurement:
                    unit.unitOfMeasurement as UnitOfMeasurementEnum,
                unitDescription: unit.unitDescription ?? undefined,
                nutritionPerOfThisUnit: {
                    calories: unit.nutritionPerOfThisUnit.calories,
                    proteinInGrams: unit.nutritionPerOfThisUnit.proteinInGrams,
                    fatInGrams: unit.nutritionPerOfThisUnit.fatInGrams,
                    carbohydratesInGrams:
                        unit.nutritionPerOfThisUnit.carbohydratesInGrams,
                    fiberInGrams: unit.nutritionPerOfThisUnit.fiberInGrams,
                    sugarInGrams: unit.nutritionPerOfThisUnit.sugarInGrams,
                    sodiumInMilligrams:
                        unit.nutritionPerOfThisUnit.sodiumInMilligrams,
                },
                source: unit.source as
                    | "user_measured"
                    | "package_label"
                    | "database"
                    | "estimated",
            })),
        },
    };
    const updatedFoodItemUnitEvent =
        foodItemUnitUpdatedSchema.safeParse(updatedFoodItemUnits);
    if (!updatedFoodItemUnitEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid food item unit data",
                updatedFoodItemUnitEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUpdatedFoodItemUnitEvent = updatedFoodItemUnitEvent.data;

    try {
        await FlowcorePathways.write(
            "food-item.v0/food-item.units.updated.v0",
            {
                data: safeUpdatedFoodItemUnitEvent,
            }
        );
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to create food item units", error),
            StatusCodes.SERVER_ERROR
        );
    }
});
