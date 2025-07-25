import type { FlowcoreEvent } from "@flowcore/pathways";
import type { z } from "zod";
import type { foodItemSchema } from "../../contracts/food/food-item";
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
