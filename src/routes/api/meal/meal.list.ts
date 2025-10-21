import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { mealInstructions, meals } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

export function registerListMeals(app: Hono) {
    app.get("/", async (c) => {
        const safeUserId = c.userId!;

        const userMeals = await db
            .select()
            .from(meals)
            .where(eq(meals.userId, safeUserId));

        const mealsWithRecipes = userMeals.map((meal) => ({
            id: meal.id,
            mealName: meal.mealName,
            hasMealBeenConsumed: meal.hasMealBeenConsumed,
            recipes: JSON.parse(meal.recipes),
        }));

        return c.json(
            ApiResponse.success(
                "Meals retrieved successfully",
                mealsWithRecipes,
            ),
        );
    });

    app.get("/:mealId", async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");

        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, mealId),
        });

        if (!mealFromDb || mealFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Meal not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        // Get meal steps
        const steps = await db
            .select()
            .from(mealInstructions)
            .where(eq(mealInstructions.mealId, mealId))
            .orderBy(mealInstructions.instructionNumber);

        const recipes = JSON.parse(mealFromDb.recipes);

        const fullMeal = {
            id: mealFromDb.id,
            mealName: mealFromDb.mealName,
            hasMealBeenConsumed: mealFromDb.hasMealBeenConsumed,
            recipes: recipes,
            steps: steps.map((step) => ({
                id: step.id,
                recipeId: step.originalRecipeId,
                originalRecipeInstructionId: step.originalRecipeInstructionId,
                instruction: step.instruction,
                instructionNumber: step.instructionNumber,
                estimatedDurationMinutes: step.estimatedDurationMinutes,
                foodItemUnitsUsedInStep: step.foodItemUnitsUsedInStep
                    ? JSON.parse(step.foodItemUnitsUsedInStep)
                    : null,
            })),
            progress: {
                completed: steps.length,
                total: steps.length,
                percentage:
                    steps.length > 0
                        ? Math.round((steps.length / steps.length) * 100)
                        : 0,
            },
            estimatedTimeRemaining: steps
                .filter((step) => !step.estimatedDurationMinutes)
                .reduce(
                    (sum, step) => sum + (step.estimatedDurationMinutes || 0),
                    0,
                ),
        };

        return c.json(
            ApiResponse.success("Meal retrieved successfully", fullMeal),
        );
    });
}
