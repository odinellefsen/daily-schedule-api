import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    type FoodItemUnitType,
    foodItemUnitDeletedSchema,
} from "../../../contracts/food/food-item";
import type { UnitOfMeasurementEnum } from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { foodItemUnits } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import foodItem from "./food-item.create";

// client side request schema
const deleteFoodItemUnitRequestSchema = z.object({
    unitIds: z.array(z.string().uuid()),
});

foodItem.delete("/:foodItemId/units", async (c) => {
    const safeUserId = c.userId!;

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

    const foodItemArr: FoodItemUnitType["units"] = [];
    let foodItemId = "";
    let hasFoodItemIdBeenSet = false;

    for (const unitId of safeDeleteFoodItemUnitRequestBody.unitIds) {
        const foodItemUnitFromDb = await db.query.foodItemUnits.findFirst({
            where: eq(foodItemUnits.id, unitId),
        });

        if (!foodItemUnitFromDb) {
            return c.json(
                ApiResponse.error(`Food item unit not found`),
                StatusCodes.NOT_FOUND
            );
        }
        if (!hasFoodItemIdBeenSet) {
            foodItemId = foodItemUnitFromDb.foodItemId;
            hasFoodItemIdBeenSet = true;
        }

        foodItemArr.push({
            id: foodItemUnitFromDb.id,
            unitOfMeasurement:
                foodItemUnitFromDb.unitOfMeasurement as UnitOfMeasurementEnum,
            unitDescription: foodItemUnitFromDb.unitDescription ?? undefined,
            nutritionPerOfThisUnit: {
                calories: foodItemUnitFromDb.calories,
                proteinInGrams: foodItemUnitFromDb.proteinInGrams,
                carbohydratesInGrams: foodItemUnitFromDb.carbohydratesInGrams,
                fatInGrams: foodItemUnitFromDb.fatInGrams,
                fiberInGrams: foodItemUnitFromDb.fiberInGrams,
                sugarInGrams: foodItemUnitFromDb.sugarInGrams,
                sodiumInMilligrams: foodItemUnitFromDb.sodiumInMilligrams,
            },
            source: "user_measured" as const,
        });
    }

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

    try {
        await FlowcorePathways.write(
            "food-item.v0/food-item.units.deleted.v0",
            {
                data: newDeleteFoodItemUnitEvent.data,
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
