import { and, eq } from "drizzle-orm";
import z from "zod";
import { type MealCreateType, mealSchema } from "../../../contracts/food/meal";
import { db } from "../../../db";
import { meals, recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import meal from ".";

// client side request schema
const createMealRequestSchema = z.object({
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

meal.post("/", async (c) => {
    const safeUserId = c.userId!;

    const rawJsonBody = await c.req.json();
    const parsedJsonBody = createMealRequestSchema.safeParse(rawJsonBody);
    if (!parsedJsonBody.success) {
        return c.json(
            ApiResponse.error("Invalid meal data", parsedJsonBody.error.errors),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateMealJsonBody = parsedJsonBody.data;

    const existingMeal = await db
        .select()
        .from(meals)
        .where(
            and(
                eq(meals.mealName, safeCreateMealJsonBody.mealName),
                eq(meals.userId, safeUserId)
            )
        );
    if (existingMeal.length > 0) {
        return c.json(
            ApiResponse.error("Meal with name already exists"),
            StatusCodes.CONFLICT
        );
    }

    // Get recipe snapshots with current versions
    const recipeInstances = [];
    for (const recipeRef of safeCreateMealJsonBody.recipes) {
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

    const newMeal: MealCreateType = {
        id: crypto.randomUUID(),
        userId: safeUserId,
        mealName: safeCreateMealJsonBody.mealName,
        scheduledToBeEatenAt: safeCreateMealJsonBody.scheduledToBeEatenAt,
        hasMealBeenConsumed: false,
        recipes: recipeInstances,
    };

    const createMealEvent = mealSchema.safeParse(newMeal);
    if (!createMealEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid meal data",
                createMealEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateMealEvent = createMealEvent.data;

    try {
        await FlowcorePathways.write("meal.v0/meal.created.v0", {
            data: safeCreateMealEvent,
        });
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to create meal", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success("Meal created successfully", safeCreateMealEvent)
    );
});

export default meal;
