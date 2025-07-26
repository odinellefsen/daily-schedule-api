import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    type MealUpdateType,
    mealUpdateSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { meals, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import meal from ".";

// client side request schema
const updateMealRequestSchema = z.object({
    mealName: z
        .string()
        .min(1, "Meal name min length is 1")
        .max(100, "Meal name max length is 100"),
    scheduledToBeEatenAt: z.string().datetime().optional(),
    recipes: z
        .array(
            z.object({
                recipeId: z.string().uuid(),
                scalingFactor: z.number().positive().default(1.0),
            })
        )
        .min(1)
        .max(20),
});

meal.patch("/", async (c) => {
    const safeUserId = c.userId!;

    const rawRequestJsonBody = await c.req.json();
    const parsedRequestJsonBody =
        updateMealRequestSchema.safeParse(rawRequestJsonBody);
    if (!parsedRequestJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid meal data",
                parsedRequestJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUpdateMealRequestBody = parsedRequestJsonBody.data;

    const mealFromDb = await db.query.meals.findFirst({
        where: and(
            eq(meals.mealName, safeUpdateMealRequestBody.mealName),
            eq(meals.userId, safeUserId)
        ),
    });
    if (!mealFromDb) {
        return c.json(
            ApiResponse.error("Meal not found"),
            StatusCodes.NOT_FOUND
        );
    }

    // Get recipe snapshots with current versions
    const recipeInstances = [];
    for (const recipeRef of safeUpdateMealRequestBody.recipes) {
        const recipeFromDb = await db.query.recipes.findFirst({
            where: eq(recipes.id, recipeRef.recipeId),
        });

        if (!recipeFromDb || recipeFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error(
                    `Recipe ${recipeRef.recipeId} not found or access denied`
                ),
                StatusCodes.NOT_FOUND
            );
        }

        recipeInstances.push({
            recipeId: recipeRef.recipeId,
            recipeName: recipeFromDb.nameOfTheRecipe,
            recipeVersion: recipeFromDb.version,
            scalingFactor: recipeRef.scalingFactor,
        });
    }

    const updatedMeal: MealUpdateType = {
        id: mealFromDb.id,
        userId: safeUserId,
        mealName: safeUpdateMealRequestBody.mealName,
        scheduledToBeEatenAt: safeUpdateMealRequestBody.scheduledToBeEatenAt,
        hasMealBeenConsumed: mealFromDb.hasMealBeenConsumed,
        recipes: recipeInstances,
        oldValues: {
            id: mealFromDb.id,
            userId: mealFromDb.userId,
            mealName: mealFromDb.mealName,
            scheduledToBeEatenAt:
                mealFromDb.scheduledToBeEatenAt?.toISOString(),
            hasMealBeenConsumed: mealFromDb.hasMealBeenConsumed,
            recipes: JSON.parse(mealFromDb.recipes),
        },
    };

    const updateMealEvent = mealUpdateSchema.safeParse(updatedMeal);
    if (!updateMealEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid meal data",
                updateMealEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUpdateMealEvent = updateMealEvent.data;

    try {
        await FlowcorePathways.write("meal.v0/meal.updated.v0", {
            data: safeUpdateMealEvent,
        });
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to update meal", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success("Meal updated successfully", safeUpdateMealEvent)
    );
});

export default meal;
