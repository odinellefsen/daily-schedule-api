import type { FlowcoreEvent } from "@flowcore/pathways";
import { and, eq, inArray } from "drizzle-orm";
import type {
    FoodItemUnitDeletedType,
    FoodItemUnitType,
} from "../../contracts/food/food-item";
import { db } from "../../db";
import { foodItemUnits } from "../../db/schemas";

export async function handleFoodItemUnitsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: FoodItemUnitType;
    },
) {
    const { payload } = event;

    await db.insert(foodItemUnits).values(
        payload.units.map((unit) => ({
            id: unit.id,
            foodItemId: payload.foodItemId,
            unitOfMeasurement: unit.unitOfMeasurement,
            unitDescription: unit.unitDescription,
            calories: unit.nutritionPerOfThisUnit.calories,
            proteinInGrams: unit.nutritionPerOfThisUnit.proteinInGrams,
            carbohydratesInGrams:
                unit.nutritionPerOfThisUnit.carbohydratesInGrams,
            fatInGrams: unit.nutritionPerOfThisUnit.fatInGrams,
            fiberInGrams: unit.nutritionPerOfThisUnit.fiberInGrams,
            sugarInGrams: unit.nutritionPerOfThisUnit.sugarInGrams,
            sodiumInMilligrams: unit.nutritionPerOfThisUnit.sodiumInMilligrams,
            source: unit.source,
        })),
    );
}

export async function handleFoodItemUnitsDeleted(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: FoodItemUnitDeletedType;
    },
) {
    const { payload } = event;

    const unitIds = payload.units.map((unit) => unit.id);

    await db
        .delete(foodItemUnits)
        .where(
            and(
                inArray(foodItemUnits.id, unitIds),
                eq(foodItemUnits.foodItemId, payload.foodItemId),
            ),
        );
}
