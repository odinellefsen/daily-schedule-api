import type { Hono } from "hono";
import {
    getMealProgressForDate,
    getMealsProgressForDate,
} from "../../../services/meal-progress";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

export function registerMealProgress(app: Hono) {
    // Get progress for a specific meal on a specific date
    app.get("/:mealId/progress/:date", async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");
        const targetDate = c.req.param("date"); // YYYY-MM-DD format

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
            return c.json(
                ApiResponse.error("Invalid date format. Use YYYY-MM-DD"),
                StatusCodes.BAD_REQUEST,
            );
        }

        try {
            const progress = await getMealProgressForDate(
                mealId,
                safeUserId,
                targetDate,
            );

            return c.json(
                ApiResponse.success(
                    `Progress for meal on ${targetDate}`,
                    progress,
                ),
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to get meal progress", error),
                StatusCodes.SERVER_ERROR,
            );
        }
    });

    // Get progress for all meals on a specific date
    app.get("/progress/:date", async (c) => {
        const safeUserId = c.userId!;
        const targetDate = c.req.param("date"); // YYYY-MM-DD format

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
            return c.json(
                ApiResponse.error("Invalid date format. Use YYYY-MM-DD"),
                StatusCodes.BAD_REQUEST,
            );
        }

        try {
            const allMealProgress = await getMealsProgressForDate(
                safeUserId,
                targetDate,
            );

            return c.json(
                ApiResponse.success(`Progress for all meals on ${targetDate}`, {
                    date: targetDate,
                    meals: allMealProgress,
                    summary: {
                        totalMeals: allMealProgress.length,
                        completedMeals: allMealProgress.filter(
                            (meal) => meal.progress.percentComplete === 100,
                        ).length,
                        inProgressMeals: allMealProgress.filter(
                            (meal) =>
                                meal.progress.percentComplete > 0 &&
                                meal.progress.percentComplete < 100,
                        ).length,
                        notStartedMeals: allMealProgress.filter(
                            (meal) => meal.progress.percentComplete === 0,
                        ).length,
                    },
                }),
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to get meals progress", error),
                StatusCodes.SERVER_ERROR,
            );
        }
    });

    // Get progress for today's meals (convenience endpoint)
    app.get("/progress/today", async (c) => {
        const safeUserId = c.userId!;
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        try {
            const todayProgress = await getMealsProgressForDate(
                safeUserId,
                today,
            );

            return c.json(
                ApiResponse.success("Progress for today's meals", {
                    date: today,
                    meals: todayProgress,
                    summary: {
                        totalMeals: todayProgress.length,
                        completedMeals: todayProgress.filter(
                            (meal) => meal.progress.percentComplete === 100,
                        ).length,
                        activeOccurrences: todayProgress.filter(
                            (meal) => meal.occurrence?.status === "active",
                        ).length,
                        nextTasks: todayProgress
                            .filter((meal) => meal.progress.nextInstruction)
                            .map((meal) => ({
                                mealId: meal.mealId,
                                nextInstruction: meal.progress.nextInstruction,
                                estimatedTimeRemaining:
                                    meal.progress.estimatedTimeRemaining,
                            })),
                    },
                }),
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to get today's meal progress", error),
                StatusCodes.SERVER_ERROR,
            );
        }
    });
}
