import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { weeklyHabitCreationSchema } from "../../../contracts/habit/habit.contract";
import { db } from "../../../db";
import { mealRecipes, meals, recipeInstructions } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

/**
 * Subtract minutes from a time string (HH:MM format)
 * @param time - Time string in HH:MM format (e.g., "18:00")
 * @param minutes - Minutes to subtract
 * @returns New time string in HH:MM format
 */
function subtractMinutesFromTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + mins - minutes;

    // Handle negative wrap-around (previous day)
    const adjustedMinutes = totalMinutes < 0 ? 0 : totalMinutes;

    const newHours = Math.floor(adjustedMinutes / 60);
    const newMins = adjustedMinutes % 60;

    return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
}

export function registerCreateHabit(app: Hono) {
    // Create multiple domain-linked habits in a batch (e.g., meal instructions)
    app.post("/batch", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsedJsonBody = weeklyHabitCreationSchema.safeParse(rawJsonBody);

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

        // Validate domain is "meal" for this endpoint
        if (safeBatchHabitData.domain !== "meal") {
            return c.json(
                ApiResponse.error(
                    "Unsupported domain for batch habits",
                    `Expected domain 'meal', got '${safeBatchHabitData.domain}'. Only meal domain is currently supported.`,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        // Validate meal exists
        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, safeBatchHabitData.entityId),
        });

        if (!mealFromDb || mealFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal entity",
                    `Meal ${safeBatchHabitData.entityId} not found or access denied`,
                ),
                StatusCodes.NOT_FOUND,
            );
        }

        // Fetch all recipes attached to this meal
        const mealRecipesForEntity = await db
            .select()
            .from(mealRecipes)
            .where(eq(mealRecipes.mealId, safeBatchHabitData.entityId))
            .orderBy(mealRecipes.orderInMeal);

        if (mealRecipesForEntity.length === 0) {
            return c.json(
                ApiResponse.error(
                    "No recipes attached to meal",
                    `Meal ${safeBatchHabitData.entityId} has no recipes. Attach recipes using POST /api/meal/:id/recipes before creating a habit.`,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        // Fetch all instructions for all recipes in this meal
        const allInstructions = [];
        for (const mealRecipe of mealRecipesForEntity) {
            const instructions = await db
                .select()
                .from(recipeInstructions)
                .where(eq(recipeInstructions.recipeId, mealRecipe.recipeId))
                .orderBy(recipeInstructions.instructionNumber);

            allInstructions.push(...instructions);
        }

        if (allInstructions.length === 0) {
            return c.json(
                ApiResponse.error(
                    "No instructions found",
                    `None of the recipes attached to meal ${safeBatchHabitData.entityId} have instructions`,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        // Validate that all provided subEntityIds exist in the recipe instructions
        const validInstructionIds = new Set(
            allInstructions.map((instr) => instr.id),
        );
        const providedSubEntityIds = safeBatchHabitData.subEntities
            .map((se) => se.subEntityId)
            .filter((id): id is string => id !== undefined);

        for (const subEntityId of providedSubEntityIds) {
            if (!validInstructionIds.has(subEntityId)) {
                return c.json(
                    ApiResponse.error(
                        "Invalid subEntityId",
                        `Instruction ${subEntityId} not found in meal's recipes`,
                    ),
                    StatusCodes.BAD_REQUEST,
                );
            }
        }

        // Build a set of configured instruction IDs
        const configuredInstructionIds = new Set(providedSubEntityIds);

        // Add unconfigured instructions - they happen at the same time as the main event
        const unconfiguredInstructions = allInstructions.filter(
            (instr) => !configuredInstructionIds.has(instr.id),
        );

        const additionalSubEntities = unconfiguredInstructions.map((instr) => ({
            subEntityId: instr.id,
            scheduledWeekday: safeBatchHabitData.targetWeekday,
            // Schedule 30 minutes before the main event, or use main event time if not specified
            scheduledTime: safeBatchHabitData.targetTime
                ? subtractMinutesFromTime(safeBatchHabitData.targetTime, 30)
                : undefined,
        }));

        // Merge user-configured and auto-generated subEntities
        const completeSubEntities = [
            ...safeBatchHabitData.subEntities,
            ...additionalSubEntities,
        ];

        console.log(
            `Habit creation [meal]: ${safeBatchHabitData.subEntities.length} user-configured, ${additionalSubEntities.length} auto-added from ${mealRecipesForEntity.length} recipes`,
        );

        try {
            await FlowcorePathways.write("habit.v0/complex-habit.created.v0", {
                data: {
                    ...safeBatchHabitData,
                    subEntities: completeSubEntities,
                },
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
                userConfiguredCount: safeBatchHabitData.subEntities.length,
                autoAddedCount: additionalSubEntities.length,
                totalSubEntityCount: completeSubEntities.length,
            }),
            StatusCodes.CREATED,
        );
    });
}
