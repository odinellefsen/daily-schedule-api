import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    type FoodItemUnitType,
    foodItemUnitSchema,
} from "../../../contracts/food/food-item/food-item-units.contract";
import { UnitOfMeasurementEnum } from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import foodItem from "./food-item.create";

// client side request schema
const createFoodItemUnitRequestSchema = foodItemUnitSchema
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

foodItem.post("/:foodItemId/units", async (c) => {
    const userId = c.userId;

    if (!userId) {
        return c.json(
            ApiResponse.error("Authentication failed - no user ID"),
            StatusCodes.UNAUTHORIZED
        );
    }

    const rawJsonBodyRequest = await c.req.json();
    const parsedJsonBodyRequest =
        createFoodItemUnitRequestSchema.safeParse(rawJsonBodyRequest);
    if (!parsedJsonBodyRequest.success) {
        return c.json(
            ApiResponse.error(
                "Invalid food item unit data",
                parsedJsonBodyRequest.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }

    const safeCreateFoodItemUnitJsonBody = parsedJsonBodyRequest.data;

    const relatedFoodItem = await db.query.foodItems.findFirst({
        where: and(
            eq(foodItems.name, safeCreateFoodItemUnitJsonBody.foodItemName),
            eq(foodItems.userId, userId)
        ),
    });

    if (!relatedFoodItem) {
        return c.json(
            ApiResponse.error("Food item does not exist"),
            StatusCodes.BAD_REQUEST
        );
    }

    const newFoodItemUnits: FoodItemUnitType = {
        foodItemId: relatedFoodItem.id,
        units: [
            {
                id: crypto.randomUUID(),
                unitOfMeasurement: UnitOfMeasurementEnum.WHOLE,
                unitDescription: "medium whole apple (about 180g)",
                nutritionPerOfThisUnit: {
                    calories: 95,
                    proteinInGrams: 0.5,
                    carbohydratesInGrams: 25,
                    fatInGrams: 0.3,
                    fiberInGrams: 4,
                    sugarInGrams: 19,
                    sodiumInMilligrams: 2,
                },
                source: "user_measured",
            },
            {
                id: crypto.randomUUID(),
                unitOfMeasurement: UnitOfMeasurementEnum.SLICE,
                unitDescription: "thin slice of apple (about 20g)",
                nutritionPerOfThisUnit: {
                    calories: 11,
                    proteinInGrams: 0.1,
                    carbohydratesInGrams: 3,
                    fatInGrams: 0.0,
                    fiberInGrams: 0.4,
                    sugarInGrams: 2.1,
                    sodiumInMilligrams: 0.2,
                },
                source: "user_measured",
            },
            {
                id: crypto.randomUUID(),
                unitOfMeasurement: UnitOfMeasurementEnum.SLICE,
                unitDescription: "thick slice of apple (about 40g)",
                nutritionPerOfThisUnit: {
                    calories: 11,
                    proteinInGrams: 0.1,
                    carbohydratesInGrams: 3,
                    fatInGrams: 0.0,
                    fiberInGrams: 0.4,
                    sugarInGrams: 2.1,
                    sodiumInMilligrams: 0.2,
                },
                source: "user_measured",
            },
        ],
    };
    const createFoodItemUnitEvent =
        foodItemUnitSchema.safeParse(newFoodItemUnits);
    if (!createFoodItemUnitEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid food item unit data",
                createFoodItemUnitEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateFoodItemUnitEvent = createFoodItemUnitEvent.data;

    try {
        await FlowcorePathways.write(
            "food-item.v0/food-item.units.created.v0",
            {
                data: safeCreateFoodItemUnitEvent,
            }
        );
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to create food item units", error),
            StatusCodes.SERVER_ERROR
        );
    }
});
