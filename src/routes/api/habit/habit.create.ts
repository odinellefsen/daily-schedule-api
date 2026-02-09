// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import {
    HHMM,
    habitsCreatedSchema,
    simpleHabitCreatedSchema,
    Weekday,
    YMD,
} from "../../../contracts/habit/habit.contract";
import { db } from "../../../db";
import { mealRecipes, meals, recipeInstructions } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const createComplexHabitRequestSchema = z.object({
    domain: z.literal("meal"), // e.g., "meal"
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

const baseSimpleHabitRequestSchema = z.object({
    description: z
        .string()
        .min(1, "Description is required")
        .max(250, "Description must be less than 250 characters"),
    targetTime: HHMM.optional(),
    startDate: YMD,
});

const createSimpleHabitRequestSchema = z.discriminatedUnion("recurrenceType", [
    baseSimpleHabitRequestSchema.extend({
        recurrenceType: z.literal("weekly"),
        targetWeekday: Weekday,
    }),
    baseSimpleHabitRequestSchema.extend({
        recurrenceType: z.literal("daily"),
    }),
]);

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({
        domain: z.string(),
        configuredSubEntitiesCount: z.number(),
    }),
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

const simpleHabitSuccessResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({
        domain: z.literal("simple"),
        description: z.string(),
    }),
});

// Route definition
const createBatchHabitsRoute = createRoute({
    method: "post",
    path: "/api/habit/batch",
    tags: ["Habits"],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createComplexHabitRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Batch habits created successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema,
                },
            },
        },
        400: {
            description: "Bad Request",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        404: {
            description: "Not Found",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
    },
});

const createSimpleHabitRoute = createRoute({
    method: "post",
    path: "/api/habit/simple",
    tags: ["Habits"],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createSimpleHabitRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Simple habit created successfully",
            content: {
                "application/json": {
                    schema: simpleHabitSuccessResponseSchema,
                },
            },
        },
        400: {
            description: "Bad Request",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
    },
});

export function registerCreateHabit(app: OpenAPIHono) {
    // Create multiple domain-linked habits in a batch (e.g., meal instructions)
    app.openapi(createBatchHabitsRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeBatchHabitData = c.req.valid("json");

        // Validate domain is "meal" for this endpoint
        if (safeBatchHabitData.domain !== "meal") {
            return c.json(
                {
                    success: false as const,
                    message: "Unsupported domain for batch habits",
                    errors: `Expected domain 'meal', got '${safeBatchHabitData.domain}'. Only meal domain is currently supported.`,
                },
                400,
            );
        }

        // Validate meal exists
        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, safeBatchHabitData.entityId),
        });

        if (!mealFromDb || mealFromDb.userId !== safeUserId) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid meal entity",
                    errors: `Meal ${safeBatchHabitData.entityId} not found or access denied`,
                },
                404,
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
                {
                    success: false as const,
                    message: "No recipes attached to meal",
                    errors: `Meal ${safeBatchHabitData.entityId} has no recipes. Attach recipes using POST /api/meal/:id/recipes before creating a habit.`,
                },
                400,
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
                {
                    success: false as const,
                    message: "No instructions found",
                    errors: `None of the recipes attached to meal ${safeBatchHabitData.entityId} have instructions`,
                },
                400,
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
                    {
                        success: false as const,
                        message: "Invalid subEntityId",
                        errors: `Instruction ${subEntityId} not found in meal's recipes`,
                    },
                    400,
                );
            }
        }

        const newHabit: z.infer<typeof habitsCreatedSchema> = {
            userId: safeUserId,
            ...safeBatchHabitData,
        };

        console.log(safeUserId);

        const createHabitEvent = habitsCreatedSchema.safeParse(newHabit);
        if (!createHabitEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid habit data",
                    errors: createHabitEvent.error.errors,
                },
                400,
            );
        }
        const safeCreateHabitEvent = createHabitEvent.data;

        // Only store user-configured instructions
        // Unconfigured instructions will be auto-added at generation time
        // This ensures habits always reflect the current meal state

        try {
            await FlowcorePathways.write("habit.v0/complex-habit.created.v0", {
                data: safeCreateHabitEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to create batch habits",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Batch habits created successfully",
                data: {
                    domain: safeBatchHabitData.domain,
                    configuredSubEntitiesCount:
                        safeBatchHabitData.subEntities.length,
                },
            },
            201,
        );
    });

    // Create a simple habit that generates exactly one todo each cycle
    app.openapi(createSimpleHabitRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeSimpleHabitData = c.req.valid("json");

        const newSimpleHabit: z.infer<typeof simpleHabitCreatedSchema> = {
            userId: safeUserId,
            ...safeSimpleHabitData,
        };

        const createSimpleHabitEvent =
            simpleHabitCreatedSchema.safeParse(newSimpleHabit);
        if (!createSimpleHabitEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid simple habit data",
                    errors: createSimpleHabitEvent.error.errors,
                },
                400,
            );
        }
        const safeCreateSimpleHabitEvent = createSimpleHabitEvent.data;

        try {
            await FlowcorePathways.write("habit.v0/simple-habit.created.v0", {
                data: safeCreateSimpleHabitEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to create simple habit",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: "Simple habit created successfully",
                data: {
                    domain: "simple" as const,
                    description: safeSimpleHabitData.description,
                },
            },
            201,
        );
    });
}
