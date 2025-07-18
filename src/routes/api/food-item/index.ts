import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

export const foodItem = new Hono();

type CreateFoodItemRequest = {
    name: string;
    categoryHierarchy: string[];
};

foodItem.post("/", async (c) => {
    const foodItem = (await c.req.json()) as CreateFoodItemRequest;

    const existingFoodItems = await db
        .select()
        .from(foodItems)
        .where(eq(foodItems.name, foodItem.name));

    if (existingFoodItems.length === 0) {
        return c.json(
            ApiResponse.error("Food item already exists"),
            StatusCodes.CONFLICT
        );
    }

    return c.json({ message: "No food items found" }, 404);
});

export default foodItem;
