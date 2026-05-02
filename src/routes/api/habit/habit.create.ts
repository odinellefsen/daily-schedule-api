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
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const habitsTag = "Habits";
const jsonContentType = "application/json";
const httpPostMethod = "post";
const createBatchHabitsPath = "/api/habit/batch";
const createSimpleHabitPath = "/api/habit/simple";
const httpStatusCreated = 201;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusNotFound = 404;
const httpStatusInternalServerError = 500;
const batchHabitsCreatedDescription = "Batch habits created successfully";
const simpleHabitCreatedDescription = "Simple habit created successfully";
const badRequestResponseDescription = "Bad Request";
const unauthorizedResponseDescription = "Unauthorized";
const notFoundResponseDescription = "Not Found";
const internalServerErrorResponseDescription = "Internal Server Error";
const complexHabitCreatedEventType = "habit.v0/complex-habit.created.v0";

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
const successResponseSchema = createSuccessResponseSchema(
    z.object({
        domain: z.string(),
        configuredSubEntitiesCount: z.number(),
    }),
);

const simpleHabitSuccessResponseSchema = createSuccessResponseSchema(
    z.object({
        domain: z.literal("simple"),
        description: z.string(),
    }),
);

// Route definition
const createBatchHabitsRoute = createRoute({
    method: httpPostMethod,
    path: createBatchHabitsPath,
    tags: [habitsTag],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: createComplexHabitRequestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusCreated]: {
            description: batchHabitsCreatedDescription,
            content: {
                [jsonContentType]: {
                    schema: successResponseSchema,
                },
            },
        },
        [httpStatusBadRequest]: {
            description: badRequestResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusUnauthorized]: {
            description: unauthorizedResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusNotFound]: {
            description: notFoundResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusInternalServerError]: {
            description: internalServerErrorResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
    },
});

const createSimpleHabitRoute = createRoute({
    method: httpPostMethod,
    path: createSimpleHabitPath,
    tags: [habitsTag],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: createSimpleHabitRequestSchema,
                },
            },
        },
    },
    responses: {
        [httpStatusCreated]: {
            description: simpleHabitCreatedDescription,
            content: {
                [jsonContentType]: {
                    schema: simpleHabitSuccessResponseSchema,
                },
            },
        },
        [httpStatusBadRequest]: {
            description: badRequestResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusUnauthorized]: {
            description: unauthorizedResponseDescription,
            content: {
                [jsonContentType]: {
                    schema: errorResponseSchema,
                },
            },
        },
        [httpStatusInternalServerError]: {
            description: internalServerErrorResponseDescription,
            content: {
                [jsonContentType]: {
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
                httpStatusBadRequest,
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
                httpStatusNotFound,
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
                httpStatusBadRequest,
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
                httpStatusBadRequest,
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
                    httpStatusBadRequest,
                );
            }
        }

        const newHabit: z.infer<typeof habitsCreatedSchema> = {
            userId: safeUserId,
            ...safeBatchHabitData,
        };

        const createHabitEvent = habitsCreatedSchema.safeParse(newHabit);
        if (!createHabitEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid habit data",
                    errors: createHabitEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }
        const safeCreateHabitEvent = createHabitEvent.data;

        // Only store user-configured instructions
        // Unconfigured instructions will be auto-added at generation time
        // This ensures habits always reflect the current meal state

        try {
            await FlowcorePathways.write(complexHabitCreatedEventType, {
                data: safeCreateHabitEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to create batch habits",
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: batchHabitsCreatedDescription,
                data: {
                    domain: safeBatchHabitData.domain,
                    configuredSubEntitiesCount:
                        safeBatchHabitData.subEntities.length,
                },
            },
            httpStatusCreated,
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
