import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import { HHMM, Weekday, YMD } from "../../../contracts/habit/habit.contract";
import { db } from "../../../db";
import { mealRecipes, meals, recipeInstructions } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

const createComplexHabitRequestSchema = z.object({
    domain: z.string(), // e.g., "meal"
    entityId: z.string().uuid(), // e.g., mealId

    // Main habit configuration (so far only weekly)
    recurrenceType: z.literal("weekly"),
    targetWeekday: Weekday, // When the main event should happen
    targetTime: HHMM.optional(), // HH:MM when main event should happen
    startDate: YMD,

    subEntities: z
        .array(
            z.object({
                // as in instructions in a meal recipe
                subEntityId: z.string().uuid().optional(),
                scheduledWeekday: Weekday,
                scheduledTime: HHMM.optional(),
            }),
        )
        .min(1),
});

export function registerCreateHabit(app: Hono) {
    // Create multiple domain-linked habits in a batch (e.g., meal instructions)
    app.post("/batch", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsedJsonBody =
            createComplexHabitRequestSchema.safeParse(rawJsonBody);

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

        // Only store user-configured instructions
        // Unconfigured instructions will be auto-added at generation time
        // This ensures habits always reflect the current meal state

        try {
            await FlowcorePathways.write("habit.v0/complex-habit.created.v0", {
                data: {
                    userId: safeUserId,
                    ...safeBatchHabitData,
                    subEntities: safeBatchHabitData.subEntities, // Only configured ones
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
                configuredSubEntitiesCount:
                    safeBatchHabitData.subEntities.length,
            }),
            StatusCodes.CREATED,
        );
    });
}
