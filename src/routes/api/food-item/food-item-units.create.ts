import { z } from "zod";
import { UnitOfMeasurementEnum } from "../../../contracts/food/recipe";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import foodItem from "./food-item.create";

// client side request schema
const createFoodItemUnitRequestSchema = z.object({
    unitOfMeasurement: z.nativeEnum(UnitOfMeasurementEnum),
    unitDescription: z
        .string()
        .max(100, "Unit description must be less than 100 characters"),
});

foodItem.post("/:foodItemId/units", async (c) => {
    const userId = c.userId;

    if (!userId) {
        return c.json(
            ApiResponse.error("Authentication failed - no user ID"),
            StatusCodes.UNAUTHORIZED
        );
    }
});
