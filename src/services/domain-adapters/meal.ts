import { eq } from "drizzle-orm";
import { db } from "../../db";
import { meals, recipeSteps, recipes } from "../../db/schemas";
import type { DomainAdapter } from "./base";

/**
 * Meal snapshot for replay safety
 */
export interface MealSnapshot {
    id: string;
    mealName: string;
    recipes: Array<{
        recipeId: string;
        recipeVersion: number;
        recipeName: string;
    }>;
    // Could include nutrition data, etc.
}

/**
 * Step plan payload for meal habits
 * This is stored in habit.relationTemplate.payload
 */
export interface MealStepPlan {
    // Strategy for which recipe instructions to include
    includeStrategy: "all" | "tagged" | "explicit";

    // For "tagged" strategy - include instructions with these tags
    tags?: string[];

    // For "explicit" strategy - specific instruction keys
    explicitInstructions?: Array<{
        recipeId: string;
        instructionId: string; // We'll resolve version at generation time
        offsetDays: number;
        titleOverride?: string;
    }>;

    // Default offset for "all" strategy
    defaultOffsetDays?: number;
}

/**
 * Meal domain adapter implementation
 */
export class MealAdapter implements DomainAdapter<MealSnapshot> {
    domain = "meal" as const;

    async getLatestVersion(entityId: string): Promise<number> {
        const meal = await db.query.meals.findFirst({
            where: eq(meals.id, entityId),
        });

        if (!meal) {
            throw new Error(`Meal not found: ${entityId}`);
        }

        // For now, meals don't have explicit versioning
        // We could add a version field later or derive it from updated_at
        return 1;
    }

    async snapshot(entityId: string, version: number): Promise<MealSnapshot> {
        const meal = await db.query.meals.findFirst({
            where: eq(meals.id, entityId),
        });

        if (!meal) {
            throw new Error(`Meal not found: ${entityId}`);
        }

        // Parse the recipes JSON from the meal
        const recipesData = JSON.parse(meal.recipes) as Array<{
            recipeId: string;
            recipeVersion: number;
        }>;

        // Fetch recipe details for the snapshot
        const recipeDetails = await Promise.all(
            recipesData.map(async (r) => {
                const recipe = await db.query.recipes.findFirst({
                    where: eq(recipes.id, r.recipeId),
                });
                return {
                    recipeId: r.recipeId,
                    recipeVersion: r.recipeVersion,
                    recipeName: recipe?.nameOfTheRecipe || "Unknown Recipe",
                };
            }),
        );

        return {
            id: meal.id,
            mealName: meal.mealName,
            recipes: recipeDetails,
        };
    }

    async resolvePlan(
        payload: unknown,
        entityId: string,
        entityVersion: number,
    ): Promise<
        Array<{
            instructionKey: {
                recipeId: string;
                recipeVersion: number;
                instructionId: string;
            };
            offsetDays: number;
            titleOverride?: string;
        }>
    > {
        // If no payload, return empty array (whole meal without steps)
        if (!payload) {
            return [];
        }

        const stepPlan = payload as MealStepPlan;
        const meal = await this.snapshot(entityId, entityVersion);

        switch (stepPlan.includeStrategy) {
            case "all":
                return this.resolveAllInstructions(
                    meal,
                    stepPlan.defaultOffsetDays || 0,
                );

            case "explicit":
                return this.resolveExplicitInstructions(
                    stepPlan.explicitInstructions || [],
                );

            case "tagged":
                // For now, return empty - would need to implement tag system
                return [];

            default:
                return [];
        }
    }

    private async resolveAllInstructions(
        meal: MealSnapshot,
        defaultOffsetDays: number,
    ): Promise<
        Array<{
            instructionKey: {
                recipeId: string;
                recipeVersion: number;
                instructionId: string;
            };
            offsetDays: number;
            titleOverride?: string;
        }>
    > {
        const instructions = [];

        for (const recipe of meal.recipes) {
            // Get all steps for this recipe
            const steps = await db.query.recipeSteps.findMany({
                where: eq(recipeSteps.recipeId, recipe.recipeId),
                orderBy: recipeSteps.stepNumber,
            });

            for (const step of steps) {
                instructions.push({
                    instructionKey: {
                        recipeId: recipe.recipeId,
                        recipeVersion: recipe.recipeVersion,
                        instructionId: step.id,
                    },
                    offsetDays: defaultOffsetDays,
                    titleOverride: `${recipe.recipeName}: ${step.instruction}`,
                });
            }
        }

        return instructions;
    }

    private async resolveExplicitInstructions(
        explicitInstructions: Array<{
            recipeId: string;
            instructionId: string;
            offsetDays: number;
            titleOverride?: string;
        }>,
    ): Promise<
        Array<{
            instructionKey: {
                recipeId: string;
                recipeVersion: number;
                instructionId: string;
            };
            offsetDays: number;
            titleOverride?: string;
        }>
    > {
        const instructions = [];

        for (const explicit of explicitInstructions) {
            // Get current recipe version
            const recipe = await db.query.recipes.findFirst({
                where: eq(recipes.id, explicit.recipeId),
            });

            if (recipe) {
                instructions.push({
                    instructionKey: {
                        recipeId: explicit.recipeId,
                        recipeVersion: recipe.version,
                        instructionId: explicit.instructionId,
                    },
                    offsetDays: explicit.offsetDays,
                    titleOverride: explicit.titleOverride,
                });
            }
        }

        return instructions;
    }
}
