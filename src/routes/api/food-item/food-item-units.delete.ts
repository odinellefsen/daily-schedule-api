import z from "zod";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import foodItem from "./food-item.create";

// client side request schema
const deleteFoodItemUnitRequestSchema = z.object({
    unitIds: z.union([z.string().uuid(), z.array(z.string().uuid())]),
});

foodItem.delete("/:foodItemId/units", async (c) => {
    const safeUserId = c.userId!;

    const rawJsonBodyRequest = await c.req.json();
    const parsedJsonBodyRequest =
        deleteFoodItemUnitRequestSchema.safeParse(rawJsonBodyRequest);
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
