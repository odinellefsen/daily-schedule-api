import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    type FoodItemUpdatedType,
    foodItemSchema,
} from "../../../contracts/food/food-item";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import foodItem from ".";

const updateFoodItemRequestSchema = z.object({
    foodItemName: z
        .string()
        .min(1, "Food item name min length is 1")
        .max(100, "Food item name max length is 100"),
    categoryHierarchy: z.array(z.string()).optional(),
});

foodItem.patch("/", async (c) => {
    const rawUserId = c.req.header("X-User-Id");
    const userIdSchema = z.string().uuid("Invalid user UUID");
    const parsedUserId = userIdSchema.safeParse(rawUserId);
    if (!parsedUserId.success) {
        return c.json(
            ApiResponse.error("User ID is required", parsedUserId.error.errors),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUserId = parsedUserId.data;

    const rawJsonBody = await c.req.json();
    const parsedJsonBody = updateFoodItemRequestSchema.safeParse(rawJsonBody);
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

    const foodItem = await db
        .select()
        .from(foodItems)
        .where(
            and(
                eq(foodItems.name, safeCreateFoodItemJsonBody.foodItemName),
                eq(foodItems.userId, safeUserId)
            )
        );
    if (foodItem.length <= 0) {
        return c.json(
            ApiResponse.error("Food item not found"),
            StatusCodes.NOT_FOUND
        );
    }

    const updatedFoodItem: FoodItemUpdatedType = {
        foodItemId: foodItem[0].id,
        userId: safeUserId,
        name: safeCreateFoodItemJsonBody.foodItemName,
        categoryHierarchy: safeCreateFoodItemJsonBody.categoryHierarchy,
        oldValues: {
            foodItemId: foodItem[0].id,
            userId: foodItem[0].userId,
            name: foodItem[0].name,
            categoryHierarchy: foodItem[0].categoryHierarchy.split(","),
        },
    };

    const updatedFoodItemEvent = foodItemSchema.safeParse(updatedFoodItem);
    if (!updatedFoodItemEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid food item data",
                updatedFoodItemEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUpdatedFoodItemEvent = updatedFoodItemEvent.data;

    try {
        await FlowcorePathways.write("food-item.v0/food-item.created.v0", {
            data: safeUpdatedFoodItemEvent,
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
            safeUpdatedFoodItemEvent
        )
    );
});

export default foodItem;
