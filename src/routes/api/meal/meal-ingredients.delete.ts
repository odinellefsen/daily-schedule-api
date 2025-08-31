import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealIngredientsArchiveType,
    mealIngredientsArchiveSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { meals } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const deleteMealIngredientsRequestSchema = z.object({
    mealId: z.string().uuid(),
});

export function registerDeleteMealIngredients(app: Hono) {
    app.delete("/ingredients", async (c) => {
        const safeUserId = c.userId!;

        const rawRequestJsonBody = await c.req.json();
        const parsedRequestJsonBody =
            deleteMealIngredientsRequestSchema.safeParse(rawRequestJsonBody);
        if (!parsedRequestJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal ingredients data",
                    parsedRequestJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeDeleteMealIngredientsRequestBody = parsedRequestJsonBody.data;

        // Verify meal exists and belongs to user
        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, safeDeleteMealIngredientsRequestBody.mealId),
        });

        if (!mealFromDb || mealFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Meal not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        // For now, create a simplified archive event since we don't have the table yet
        const mealIngredientsArchived: MealIngredientsArchiveType = {
            mealId: safeDeleteMealIngredientsRequestBody.mealId,
            ingredients: [], // Would fetch existing ingredients from DB
            reasonForArchiving: "User requested deletion",
        };

        const mealIngredientsArchivedEvent =
            mealIngredientsArchiveSchema.safeParse(mealIngredientsArchived);
        if (!mealIngredientsArchivedEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal ingredients archived data",
                    mealIngredientsArchivedEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeMealIngredientsArchivedEvent =
            mealIngredientsArchivedEvent.data;

        try {
            await FlowcorePathways.write(
                "meal.v0/meal-ingredients.archived.v0",
                {
                    data: safeMealIngredientsArchivedEvent,
                },
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to archive meal ingredients", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Meal ingredients archived successfully",
                safeMealIngredientsArchivedEvent,
            ),
        );
    });
}
