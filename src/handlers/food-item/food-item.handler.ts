import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    foodItemDeletedSchema,
    foodItemSchema,
} from "../../contracts/food/food-item";
import { db } from "../../db";
import { foodItems } from "../../db/schemas";

export async function handleFoodItemCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof foodItemSchema>;
    },
) {
    const { payload } = event;

    await db.insert(foodItems).values({
        id: payload.id,
        name: payload.name,
        categoryHierarchy: payload.categoryHierarchy,
        userId: payload.userId,
    });
}

export async function handleFoodItemDeleted(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof foodItemDeletedSchema>;
    },
) {
    const { payload } = event;

    await db.delete(foodItems).where(eq(foodItems.id, payload.foodItemId));
}
