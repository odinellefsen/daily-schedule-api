import type { Hono } from "hono";
import z from "zod";
import { type MealCreateType, mealSchema } from "../../../contracts/food/meal";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";

// client side request schema
const createMealRequestSchema = z.object({
    mealName: z
        .string()
        .min(1, "Meal name min length is 1")
        .max(100, "Meal name max length is 100"),
});

export function registerCreateMeal(app: Hono) {
    app.post("/", async (c) => {
        const safeUserId = c.userId!;

        const rawJsonBody = await c.req.json();
        const parsedJsonBody = createMealRequestSchema.safeParse(rawJsonBody);
        if (!parsedJsonBody.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal data",
                    parsedJsonBody.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
            );
        }
        const safeCreateMealJsonBody = parsedJsonBody.data;

        const newMeal: MealCreateType = {
            id: crypto.randomUUID(),
            userId: safeUserId,
            mealName: safeCreateMealJsonBody.mealName,
        };

        const createMealEvent = mealSchema.safeParse(newMeal);
        if (!createMealEvent.success) {
            return c.json(
                ApiResponse.error(
                    "Invalid meal data",
                    createMealEvent.error.errors,
                ),
                StatusCodes.BAD_REQUEST,
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
                StatusCodes.SERVER_ERROR,
            );
        }

        const { userId: _, ...createMeal } = safeCreateMealEvent;

        return c.json(
            ApiResponse.success("Meal created successfully", {
                meal: createMeal,
                message:
                    "Meal created. Use POST /api/meal/:id/recipes to attach recipes.",
            }),
            StatusCodes.CREATED,
        );
    });
}
