import { eq } from "drizzle-orm";
import { db } from "../../db";
import { meals, recipeInstructions } from "../../db/schemas";
import type { DomainTitleResolver } from "./base";

/**
 * Title resolver for the meal domain
 * Fetches meal and recipe instruction titles from the database
 */
export class MealTitleResolver implements DomainTitleResolver {
    async getMainEventTitle(mealId: string): Promise<string> {
        const meal = await db.query.meals.findFirst({
            where: eq(meals.id, mealId),
        });

        if (!meal) {
            console.warn(`Meal not found for ID: ${mealId}`);
            return "Unknown Meal";
        }

        return `Eat: ${meal.mealName}`;
    }

    async getSubEntityTitle(instructionId: string): Promise<string> {
        const instruction = await db.query.recipeInstructions.findFirst({
            where: eq(recipeInstructions.id, instructionId),
        });

        if (!instruction) {
            console.warn(
                `Recipe instruction not found for ID: ${instructionId}`,
            );
            return "Unknown Instruction";
        }

        return instruction.instruction;
    }
}
