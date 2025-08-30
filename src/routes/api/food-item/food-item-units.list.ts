import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { foodItems, foodItemUnits } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

export function registerListFoodItemUnits(app: Hono) {
    app.get("/:foodItemId/units", async (c) => {
        const safeUserId = c.userId!;
        const foodItemId = c.req.param("foodItemId");

        // Verify food item exists and belongs to user
        const foodItemFromDb = await db.query.foodItems.findFirst({
            where: and(
                eq(foodItems.id, foodItemId),
                eq(foodItems.userId, safeUserId)
            ),
        });

        if (!foodItemFromDb) {
            return c.json(
                ApiResponse.error("Food item not found or access denied"),
                StatusCodes.NOT_FOUND
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
            ApiResponse.success(
                "Food item units retrieved successfully",
                unitsWithFoodItem
            )
        );
    });

    app.get("/units", async (c) => {
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
            ApiResponse.success(
                "All food item units retrieved successfully",
                unitsWithFoodItems
            )
        );
    });
}
