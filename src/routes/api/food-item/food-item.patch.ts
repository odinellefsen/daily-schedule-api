import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    type FoodItemUpdatedType,
    foodItemUpdatedSchema,
} from "../../../contracts/food/food-item";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import foodItem from ".";

// client side request schema
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

    const foodItemFromDb = await db.query.foodItems.findFirst({
        where: and(
            eq(foodItems.name, safeCreateFoodItemJsonBody.foodItemName),
            eq(foodItems.userId, safeUserId)
        ),
    });
    if (!foodItemFromDb) {
        return c.json(
            ApiResponse.error("Food item not found"),
            StatusCodes.NOT_FOUND
        );
    }

    const updatedFoodItem: FoodItemUpdatedType = {
        foodItemId: foodItemFromDb.id,
        userId: safeUserId,
        name: safeCreateFoodItemJsonBody.foodItemName,
        categoryHierarchy: safeCreateFoodItemJsonBody.categoryHierarchy,
        oldValues: {
            foodItemId: foodItemFromDb.id,
            userId: foodItemFromDb.userId,
            name: foodItemFromDb.name,
            categoryHierarchy: foodItemFromDb.categoryHierarchy.split(","),
        },
    };

    const updatedFoodItemEvent =
        foodItemUpdatedSchema.safeParse(updatedFoodItem);
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
        await FlowcorePathways.write(
            "food-item.v0/food-item.metadata.updated.v0",
            {
                data: safeUpdatedFoodItemEvent,
            }
        );
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
