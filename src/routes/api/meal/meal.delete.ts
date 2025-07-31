import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealArchiveType,
    mealArchiveSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { meals } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const deleteMealRequestSchema = z.object({
    mealName: z
        .string()
        .min(1, "Meal name min length is 1")
        .max(100, "Meal name max length is 100"),
});

export function registerDeleteMeal(app: Hono) {
    app.delete("/", async (c) => {
        const safeUserId = c.userId!;

        const rawRequestJsonBody = await c.req.json();
        const parsedRequestJsonBody =
            deleteMealRequestSchema.safeParse(rawRequestJsonBody);
        if (!parsedRequestJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal data",
                    parsedRequestJsonBody.error.errors
                ),
                StatusCodes.BAD_REQUEST
            );
        }
        const safeDeleteMealRequestBody = parsedRequestJsonBody.data;

        const mealFromDb = await db.query.meals.findFirst({
            where: and(
                eq(meals.mealName, safeDeleteMealRequestBody.mealName),
                eq(meals.userId, safeUserId)
            ),
        });

        if (!mealFromDb) {
            return c.json(
                ApiResponse.error("Meal not found"),
                StatusCodes.NOT_FOUND
            );
        }

        const mealArchived: MealArchiveType = {
            id: mealFromDb.id,
            userId: safeUserId,
            mealName: mealFromDb.mealName,
            scheduledToBeEatenAt:
                mealFromDb.scheduledToBeEatenAt?.toISOString(),
            hasMealBeenConsumed: mealFromDb.hasMealBeenConsumed,
            recipes: JSON.parse(mealFromDb.recipes),
            reasonForArchiving: "User requested deletion",
        };

        const mealArchivedEvent = mealArchiveSchema.safeParse(mealArchived);
        if (!mealArchivedEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal archived data",
                    mealArchivedEvent.error.errors
                ),
                StatusCodes.BAD_REQUEST
            );
        }
        const safeMealArchivedEvent = mealArchivedEvent.data;

        try {
            await FlowcorePathways.write("meal.v0/meal.archived.v0", {
                data: safeMealArchivedEvent,
            });
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to archive meal", error),
                StatusCodes.SERVER_ERROR
            );
        }

        return c.json(
            ApiResponse.success(
                "Meal archived successfully",
                safeMealArchivedEvent
            )
        );
    });
}
