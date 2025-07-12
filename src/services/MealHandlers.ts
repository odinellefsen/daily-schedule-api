import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type {
    MealConsumptionIntentType,
    MealPlanModificationIntentType,
    MealPlanningIntentType,
    MealPreparationCompletionIntentType,
    MealStepAssignmentIntentType,
} from "../contracts/meal";
import { db } from "../db";
import { mealSteps, meals, todos } from "../db/schema";

// Handler for meal planning intent
export async function handlerMealPlanningIntentInitiated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: MealPlanningIntentType;
    }
) {
    console.log("received meal planning intent ✅", event);

    try {
        const { mealId, recipeId, scheduledToBeEatenAt, userId } =
            event.payload;

        // Insert meal plan record with existing schema
        await db.insert(meals).values({
            id: mealId,
            recipeId,
            scheduledToBeEatenAt: scheduledToBeEatenAt
                ? new Date(scheduledToBeEatenAt)
                : null,
            completed: false,
        });

        console.log("meal plan created successfully", {
            mealId,
            recipeId,
            intent: event.payload.intent,
        });
    } catch (error) {
        console.error("failed to handle meal planning intent", error);
        throw error;
    }
}

// Handler for meal step assignment intent
export async function handlerMealStepAssignmentRequested(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: MealStepAssignmentIntentType;
    }
) {
    console.log("received meal step assignment intent ✅", event);

    try {
        const { mealStepId, mealId, stepNumber, todoId, dueDate, userId } =
            event.payload;

        // Insert meal step record with existing schema
        await db.insert(mealSteps).values({
            id: mealStepId,
            mealId,
            instruction: `Step ${stepNumber} - Preparation step from recipe`,
            stepNumber,
            completed: false,
        });

        // Create todo if requested
        if (todoId) {
            await db.insert(todos).values({
                id: todoId,
                description: `Meal preparation step ${stepNumber}`,
                dueDate: dueDate ? new Date(dueDate) : null,
                completed: false,
                mealStepId: mealStepId,
            });
        }

        console.log("meal step assigned successfully", {
            mealStepId,
            mealId,
            todoId,
            intent: event.payload.intent,
        });
    } catch (error) {
        console.error("failed to handle meal step assignment intent", error);
        throw error;
    }
}

// Handler for meal preparation completion intent
export async function handlerMealPreparationCompleted(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: MealPreparationCompletionIntentType;
    }
) {
    console.log("received meal preparation completion intent ✅", event);

    try {
        const { mealId, completedSteps, userId } = event.payload;

        // Update completed steps
        for (const stepId of completedSteps) {
            await db
                .update(mealSteps)
                .set({ completed: true })
                .where(eq(mealSteps.id, stepId));
        }

        // Check if all steps are completed, then mark meal as prepared
        const allSteps = await db
            .select()
            .from(mealSteps)
            .where(eq(mealSteps.mealId, mealId));
        const allCompleted = allSteps.every((step) => step.completed);

        if (allCompleted) {
            await db
                .update(meals)
                .set({ completed: true })
                .where(eq(meals.id, mealId));
        }

        console.log("meal preparation completed successfully", {
            mealId,
            completedSteps: completedSteps.length,
            allStepsCompleted: allCompleted,
            intent: event.payload.intent,
        });
    } catch (error) {
        console.error(
            "failed to handle meal preparation completion intent",
            error
        );
        throw error;
    }
}

// Handler for meal consumption intent
export async function handlerMealConsumptionCompleted(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: MealConsumptionIntentType;
    }
) {
    console.log("received meal consumption completion intent ✅", event);

    try {
        const { mealId, consumedAt, userId } = event.payload;

        // Mark meal as completed (consumed)
        await db
            .update(meals)
            .set({ completed: true })
            .where(eq(meals.id, mealId));

        // Mark all related todos as completed
        await db
            .update(todos)
            .set({ completed: true })
            .where(eq(todos.mealStepId, mealId));

        console.log("meal consumption completed successfully", {
            mealId,
            consumedAt,
            intent: event.payload.intent,
        });
    } catch (error) {
        console.error(
            "failed to handle meal consumption completion intent",
            error
        );
        throw error;
    }
}

// Handler for meal plan modification intent
export async function handlerMealPlanModificationRequested(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: MealPlanModificationIntentType;
    }
) {
    console.log("received meal plan modification intent ✅", event);

    try {
        const { mealId, modificationType, userId, metadata } = event.payload;

        // Update meal based on modification type (with existing schema limitations)
        const updateData: any = {};

        switch (modificationType) {
            case "cancelled":
                updateData.completed = true; // Mark as completed to remove from active planning
                break;
            case "postponed":
                updateData.scheduledToBeEatenAt = metadata?.newScheduledAt
                    ? new Date(metadata.newScheduledAt)
                    : null;
                break;
            case "recipe_changed":
                updateData.recipeId = metadata?.newRecipeId;
                break;
            case "timing_changed":
                updateData.scheduledToBeEatenAt = metadata?.newScheduledAt
                    ? new Date(metadata.newScheduledAt)
                    : null;
                break;
        }

        if (Object.keys(updateData).length > 0) {
            await db.update(meals).set(updateData).where(eq(meals.id, mealId));
        }

        console.log("meal plan modification completed successfully", {
            mealId,
            modificationType,
            intent: event.payload.intent,
        });
    } catch (error) {
        console.error("failed to handle meal plan modification intent", error);
        throw error;
    }
}
