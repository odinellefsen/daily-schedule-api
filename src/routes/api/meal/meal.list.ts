import { and, eq, gte, lte } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { mealInstructions, meals } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

export function registerListMeals(app: Hono) {
    app.get("/week", async (c) => {
        const safeUserId = c.userId!;

        // Get upcoming week (today + 7 days)
        const today = new Date();
        const weekFromNow = new Date();
        weekFromNow.setDate(today.getDate() + 7);

        const upcomingMeals = await db
            .select()
            .from(meals)
            .where(
                and(
                    eq(meals.userId, safeUserId),
                    gte(meals.scheduledToBeEatenAt, today),
                    lte(meals.scheduledToBeEatenAt, weekFromNow),
                ),
            )
            .orderBy(meals.scheduledToBeEatenAt);

        // Group meals by day and add progress info
        const mealsByDay: { [key: string]: any[] } = {};

        for (const mealData of upcomingMeals) {
            const mealDate =
                mealData.scheduledToBeEatenAt?.toISOString().split("T")[0] ||
                "unscheduled";

            // Get meal progress
            const allSteps = await db
                .select()
                .from(mealInstructions)
                .where(eq(mealInstructions.mealId, mealData.id));

            const recipes = JSON.parse(mealData.recipes);

            const mealWithProgress = {
                mealId: mealData.id,
                mealName: mealData.mealName,
                scheduledToBeEatenAt:
                    mealData.scheduledToBeEatenAt?.toISOString(),
                hasMealBeenConsumed: mealData.hasMealBeenConsumed,
                recipes: recipes.map((recipe: any) => ({
                    recipeName: recipe.recipeName,
                    recipeVersion: recipe.recipeVersion,
                })),
                canStartPrep: mealData.scheduledToBeEatenAt
                    ? new Date(
                          mealData.scheduledToBeEatenAt.getTime() -
                              2 * 60 * 60 * 1000,
                      ).toISOString()
                    : // 2 hours before
                      null,
            };

            if (!mealsByDay[mealDate]) {
                mealsByDay[mealDate] = [];
            }
            mealsByDay[mealDate].push(mealWithProgress);
        }

        // Convert to array format with day metadata
        const weekPlan = Object.entries(mealsByDay)
            .map(([date, meals]) => ({
                date,
                dayName:
                    date !== "unscheduled"
                        ? new Date(date).toLocaleDateString("en-US", {
                              weekday: "long",
                          })
                        : "Unscheduled",
                meals,
                totalMeals: meals.length,
                completedMeals: meals.filter((m: any) => m.hasMealBeenConsumed)
                    .length,
                totalCookingSteps: meals.reduce(
                    (sum: number, m: any) => sum + m.progress.total,
                    0,
                ),
                completedCookingSteps: meals.reduce(
                    (sum: number, m: any) => sum + m.progress.completed,
                    0,
                ),
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return c.json(
            ApiResponse.success("Weekly meal plan retrieved successfully", {
                weekPlan,
                summary: {
                    totalMeals: upcomingMeals.length,
                    completedMeals: upcomingMeals.filter(
                        (m) => m.hasMealBeenConsumed,
                    ).length,
                    daysWithMeals: Object.keys(mealsByDay).length,
                },
            }),
        );
    });

    app.get("/", async (c) => {
        const safeUserId = c.userId!;

        const userMeals = await db
            .select()
            .from(meals)
            .where(eq(meals.userId, safeUserId))
            .orderBy(meals.scheduledToBeEatenAt);

        const mealsWithRecipes = userMeals.map((meal) => ({
            id: meal.id,
            mealName: meal.mealName,
            scheduledToBeEatenAt: meal.scheduledToBeEatenAt?.toISOString(),
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
            scheduledToBeEatenAt:
                mealFromDb.scheduledToBeEatenAt?.toISOString(),
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
