import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { FoodItemUnitType } from "../../contracts/food/food-item";
import { db } from "../../db";
import { foodItems } from "../../db/schemas";

export async function handleFoodItemUnitsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: FoodItemUnitType;
    }
) {
    const { payload } = event;

    const { foodItemId, units } = payload;

    const foodItem = await db.query.foodItems.findFirst({
        where: eq(foodItems.id, foodItemId),
    });
}
