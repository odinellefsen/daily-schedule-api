import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import z from "zod";
import {
    type MealStepByStepInstructionsType,
    mealStepByStepInstructionsSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { meals, recipeSteps } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const createMealInstructionsRequestSchema = z.object({
    mealId: z.string().uuid(),
    stepByStepInstructions: z
        .array(
            z.object({
                stepInstruction: z.string().min(1).max(250),
                foodItemUnitsUsedInStep: z
                    .array(
                        z.object({
                            foodItemUnitId: z.string().uuid(),
                            foodItemId: z.string().uuid(),
                            quantityOfFoodItemUnit: z
                                .number()
                                .positive()
                                .max(1_000_000)
                                .default(1),
                        }),
                    )
                    .optional(),
            }),
        )
        .min(1)
        .max(30),
});

export function registerCreateMealInstructions(app: Hono) {
    app.post("/instructions", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsedJsonBody =
            createMealInstructionsRequestSchema.safeParse(rawJsonBody);
        if (!parsedJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal instructions data",
                    parsedJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeCreateMealInstructionsJsonBody = parsedJsonBody.data;

        // Verify meal exists and belongs to user
        const mealFromDb = await db.query.meals.findFirst({
            where: eq(meals.id, safeCreateMealInstructionsJsonBody.mealId),
        });

        if (!mealFromDb || mealFromDb.userId !== safeUserId) {
            return c.json(
                ApiResponse.error("Meal not found or access denied"),
                StatusCodes.NOT_FOUND,
            );
        }

        const newMealInstructions: MealStepByStepInstructionsType = {
            mealId: safeCreateMealInstructionsJsonBody.mealId,
            stepByStepInstructions:
                safeCreateMealInstructionsJsonBody.stepByStepInstructions.map(
                    (step) => ({
                        id: crypto.randomUUID(),
                        stepInstruction: step.stepInstruction,
                        foodItemUnitsUsedInStep:
                            step.foodItemUnitsUsedInStep?.map(
                                (foodItemUnit) => ({
                                    foodItemUnitId: foodItemUnit.foodItemUnitId,
                                    foodItemId: foodItemUnit.foodItemId,
                                    quantityOfFoodItemUnit:
                                        foodItemUnit.quantityOfFoodItemUnit,
                                }),
                            ),
                        isStepCompleted: false,
                        stepNumber: 1,
                    }),
                ),
        };

        const createMealInstructionsEvent =
            mealStepByStepInstructionsSchema.safeParse(newMealInstructions);
        if (!createMealInstructionsEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal instructions data",
                    createMealInstructionsEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeCreateMealInstructionsEvent =
            createMealInstructionsEvent.data;

        try {
            await FlowcorePathways.write(
                "meal.v0/meal-instructions.created.v0",
                {
                    data: safeCreateMealInstructionsEvent,
                },
            );
        } catch (error) {
            return c.json(
                ApiResponse.error("Failed to create meal instructions", error),
                StatusCodes.SERVER_ERROR,
            );
        }

        return c.json(
            ApiResponse.success(
                "Meal instructions created successfully",
                safeCreateMealInstructionsEvent,
            ),
        );
    });
}
