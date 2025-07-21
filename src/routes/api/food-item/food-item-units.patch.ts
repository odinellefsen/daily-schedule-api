import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import foodItem from "./food-item.create";

foodItem.patch("/:foodItemId/units/:unitId", async (c) => {
    const userId = c.userId;

    if (!userId) {
        return c.json(
            ApiResponse.error("Authentication failed - no user ID"),
            StatusCodes.UNAUTHORIZED
        );
    }
});
