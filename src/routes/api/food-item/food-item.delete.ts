import z from "zod";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { foodItem } from ".";

foodItem.delete("/", async (c) => {
    const rawUserId = c.req.header("X-User-Id");
    const userIdSchema = z.string().uuid("Invalid user UUID");
    const parsedUserId = userIdSchema.safeParse(rawUserId);
    if (!parsedUserId.success) {
        return c.json(
            ApiResponse.error("User ID is required", parsedUserId.error.errors),
            StatusCodes.BAD_REQUEST
        );
    }
});
