import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    type FoodItemUnitType,
    foodItemUnitSchema,
} from "../../../contracts/food/food-item/food-item-units.contract";
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
    const userId = c.userId!;

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
        units: safeCreateFoodItemUnitJsonBody.units.map((unit) => ({
            id: crypto.randomUUID(),
            ...unit,
            source: "user_measured" as const,
        })),
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
