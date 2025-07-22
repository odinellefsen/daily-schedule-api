import z from "zod";
import { foodItemUnitSchema } from "../../../contracts/food/food-item";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import foodItem from "./food-item.create";

// client side request schema
const deleteFoodItemUnitRequestSchema = z.object({
    unitId: z.string().uuid(),
});

foodItem.delete("/:foodItemId/units", async (c) => {
    const safeUserId = c.userId!;

    const rawJsonBodyRequest = await c.req.json();
    const parsedJsonBodyRequest =
        foodItemUnitSchema.safeParse(rawJsonBodyRequest);
    if (!parsedJsonBodyRequest.success) {
        return c.json(
            ApiResponse.error(
                "Invalid food item unit data",
                parsedJsonBodyRequest.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
});
