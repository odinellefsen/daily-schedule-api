import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    type FoodItemType,
    foodItemSchema,
} from "../../../contracts/food/food-item";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import foodItem from ".";

// client side request schema
const createFoodItemRequestSchema = z.object({
    foodItemName: z
        .string()
        .min(1, "Food item name min length is 1")
        .max(100, "Food item name max length is 100"),
    categoryHierarchy: z.array(z.string()).optional(),
});

foodItem.post("/", async (c) => {
    const safeUserId = c.userId!;

    const rawJsonBody = await c.req.json();
    const parsedJsonBody = createFoodItemRequestSchema.safeParse(rawJsonBody);
    if (!parsedJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid food item data",
                parsedJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateFoodItemJsonBody = parsedJsonBody.data;

    const existingFoodItem = await db
        .select()
        .from(foodItems)
        .where(
            and(
                eq(foodItems.name, safeCreateFoodItemJsonBody.foodItemName),
                eq(foodItems.userId, safeUserId)
            )
        );
    if (existingFoodItem.length > 0) {
        return c.json(
            ApiResponse.error("Food item with name already exists"),
            StatusCodes.CONFLICT
        );
    }

    const newFoodItem: FoodItemType = {
        id: crypto.randomUUID(),
        userId: safeUserId,
        name: safeCreateFoodItemJsonBody.foodItemName,
        categoryHierarchy: safeCreateFoodItemJsonBody.categoryHierarchy,
    };

    const createFoodItemEvent = foodItemSchema.safeParse(newFoodItem);
    if (!createFoodItemEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid food item data",
                createFoodItemEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateFoodItemEvent = createFoodItemEvent.data;

    try {
        await FlowcorePathways.write("food-item.v0/food-item.created.v0", {
            data: safeCreateFoodItemEvent,
        });
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to create food item", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success(
            "Food item created successfully",
            safeCreateFoodItemEvent
        )
    );
});

export default foodItem;
