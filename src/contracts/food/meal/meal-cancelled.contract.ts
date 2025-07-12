import z from "zod";

// This schema is used to create and update a cancelled meal
export const mealCancelledSchema = z.object({
    mealId: z.string().uuid(),
    reasonWhyMealWasCancelled: z.string().min(1).max(250).optional(),
});

export type MealCancelledType = z.infer<typeof mealCancelledSchema>;
