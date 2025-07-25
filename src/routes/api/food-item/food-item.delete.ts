import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    type FoodItemArchivedType,
    foodItemArchivedSchema,
} from "../../../contracts/food/food-item/food-item.contract";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import { foodItem } from ".";

// client side request schema
const deleteFoodItemRequestSchema = z.object({
    foodItemName: z
        .string()
        .min(1, "Food item name min length is 1")
        .max(100, "Food item name max length is 100"),
});

foodItem.delete("/", async (c) => {
    const safeUserId = c.userId!;

    const rawRequestJsonBody = await c.req.json();
    const parsedRequestJsonBody =
        deleteFoodItemRequestSchema.safeParse(rawRequestJsonBody);
    if (!parsedRequestJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid food item data",
                parsedRequestJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeDeleteFoodItemRequestBody = parsedRequestJsonBody.data;

    const foodItemFromDb = await db.query.foodItems.findFirst({
        where: and(
            eq(foodItems.name, safeDeleteFoodItemRequestBody.foodItemName),
            eq(foodItems.userId, safeUserId)
        ),
    });

    if (!foodItemFromDb) {
        return c.json(
            ApiResponse.error("Food item not found"),
            StatusCodes.NOT_FOUND
        );
    }

    const foodItemArchived: FoodItemArchivedType = {
        id: foodItemFromDb.id,
        userId: safeUserId,
        name: foodItemFromDb.name,
        // Convert database string back to array format for contract
        categoryHierarchy: foodItemFromDb.categoryHierarchy
            ? foodItemFromDb.categoryHierarchy
            : undefined,
        reasonForArchiving: "User requested deletion",
    };

    const foodItemArchivedEvent =
        foodItemArchivedSchema.safeParse(foodItemArchived);
    if (!foodItemArchivedEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid food item archived data",
                foodItemArchivedEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeFoodItemArchivedEvent = foodItemArchivedEvent.data;

    try {
        await FlowcorePathways.write("food-item.v0/food-item.archived.v0", {
            data: safeFoodItemArchivedEvent,
        });
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to archive food item", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success(
            "Food item archived successfully",
            safeFoodItemArchivedEvent
        )
    );
});
