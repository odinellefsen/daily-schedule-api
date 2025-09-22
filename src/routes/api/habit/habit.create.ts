import type { Hono } from "hono";
import { weeklyHabitCreationSchema } from "../../../contracts/habit/habit.contract";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

export function registerCreateHabit(app: Hono) {
    // Create multiple domain-linked habits in a batch (e.g., meal instructions)
    app.post("/batch", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsedJsonBody = weeklyHabitCreationSchema.safeParse({
            ...rawJsonBody,
            userId: safeUserId,
        });

        if (!parsedJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid batch habit creation data",
                    parsedJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        const safeBatchHabitData = parsedJsonBody.data;

        try {
            await FlowcorePathways.write("habit.v0/complex-habit.created.v0", {
                data: safeBatchHabitData,
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to create batch habits", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success("Batch habits created successfully", {
                domain: safeBatchHabitData.domain,
                subEntityCount: safeBatchHabitData.subEntities.length,
            }),
            StatusCodes.CREATED,
        );
    });
}
