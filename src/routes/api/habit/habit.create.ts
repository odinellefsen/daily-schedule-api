import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { weeklyHabitCreationSchema } from "../../../contracts/habit/habit.contract";
import { db } from "../../../db";
import { mealInstructions } from "../../../db/schemas";
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

        // Validate domain is "meal" for this endpoint
        if (safeBatchHabitData.domain !== "meal") {
            return c.json(
                ApiResponse.error(
                    "Invalid domain for batch habits, currently only support for meal domain",
                    `Expected domain 'meal', got '${safeBatchHabitData.domain}'`,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        // Fetch all meal instructions for this meal
        const mealInstructionsForEntity = await db
            .select()
            .from(mealInstructions)
            .where(eq(mealInstructions.mealId, safeBatchHabitData.entityId))
            .orderBy(mealInstructions.instructionNumber);

        if (mealInstructionsForEntity.length === 0) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal entity",
                    `No meal instructions found for meal ${safeBatchHabitData.entityId}`,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }

        // Validate that all provided subEntityIds exist in the meal instructions
        const validInstructionIds = new Set(
            mealInstructionsForEntity.map((instr) => instr.id),
        );
        const providedSubEntityIds = safeBatchHabitData.subEntities
            .map((se) => se.subEntityId)
            .filter((id): id is string => id !== undefined);

        for (const subEntityId of providedSubEntityIds) {
            if (!validInstructionIds.has(subEntityId)) {
                return c.json(
                    ApiResponse.error(
                        "Invalid subEntityId",
                        `Instruction ${subEntityId} not found in meal ${safeBatchHabitData.entityId}`,
                    ),
                    StatusCodes.BAD_REQUEST,
                );
            }
        }

        // Build a set of configured instruction IDs
        const configuredInstructionIds = new Set(providedSubEntityIds);

        // Add unconfigured instructions - they happen at the same time as the main event
        const unconfiguredInstructions = mealInstructionsForEntity.filter(
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
            `Habit creation: ${safeBatchHabitData.subEntities.length} user-configured, ${additionalSubEntities.length} auto-added`,
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
