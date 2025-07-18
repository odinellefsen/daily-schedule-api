import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import z, { ZodError } from "zod";
import {
    type FoodItemType,
    foodItemSchema,
} from "../../../contracts/food/food-item";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

export const foodItem = new Hono();

foodItem.post("/", async (c) => {
    const rawData = await c.req.json();
    const userId = c.req.header("X-User-Id");

    if (!userId) {
        return c.json(
            ApiResponse.error("User ID is required"),
            StatusCodes.BAD_REQUEST
        );
    }

    const createFoodItemRequestSchema = z.object({
        foodItemName: z.string().min(1),
        categoryHierarchy: z.array(z.string()).optional(),
    });

    const parsedJsonBody = createFoodItemRequestSchema.safeParse(rawData);

    if (!parsedJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid food item data",
                parsedJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }

    const existingFoodItem = await db
        .select()
        .from(foodItems)
        .where(
            and(
                eq(foodItems.name, parsedJsonBody.data.foodItemName),
                eq(foodItems.userId, userId as string)
            )
        );

    if (existingFoodItem.length > 0) {
        return c.json(
            ApiResponse.error("Food item already exists"),
            StatusCodes.CONFLICT
        );
    }

    const newFoodItem: FoodItemType = {
        foodItemId: crypto.randomUUID(),
        userId: userId as string,
        name: parsedJsonBody.data.foodItemName,
        categoryHierarchy: parsedJsonBody.data.categoryHierarchy,
    };

    try {
        const validatedFoodItem = foodItemSchema.parse(newFoodItem);
        console.log("Validation successful:", validatedFoodItem);

        // emit event
        // const emitCreateFoodItemEvent = await FlowcorePathways.write("");

        return c.json(
            ApiResponse.success(
                "Food item created successfully",
                validatedFoodItem
            ),
            StatusCodes.CREATED
        );
    } catch (error) {
        if (error instanceof ZodError) {
            return c.json(
                ApiResponse.error("Invalid food item data", error.errors),
                StatusCodes.BAD_REQUEST
            );
        }
        return c.json(
            ApiResponse.error("Invalid food item data", error),
            StatusCodes.BAD_REQUEST
        );
    }
});

export default foodItem;
