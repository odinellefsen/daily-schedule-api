import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    todoArchiveSchema,
    todoCancelledSchema,
    todoCompletedSchema,
    todoSchema,
    todoUpdateSchema,
} from "../../contracts/todo";
import { db } from "../../db";
import { mealSteps, todos } from "../../db/schemas";

export async function handleTodoCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoSchema>;
    }
) {
    const { payload } = event;

    await db.insert(todos).values({
        id: payload.id,
        userId: payload.userId,
        description: payload.description,
        completed: payload.completed,
        scheduledFor: payload.scheduledFor
            ? new Date(payload.scheduledFor)
            : null,
        completedAt: payload.completedAt ? new Date(payload.completedAt) : null,
        relations: payload.relations ? JSON.stringify(payload.relations) : null,
    });
}

export async function handleTodoUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoUpdateSchema>;
    }
) {
    const { payload } = event;

    await db
        .update(todos)
        .set({
            description: payload.description,
            completed: payload.completed,
            scheduledFor: payload.scheduledFor
                ? new Date(payload.scheduledFor)
                : null,
            completedAt: payload.completedAt
                ? new Date(payload.completedAt)
                : null,
            relations: payload.relations
                ? JSON.stringify(payload.relations)
                : null,
        })
        .where(eq(todos.id, payload.id));
}

export async function handleTodoArchived(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoArchiveSchema>;
    }
) {
    const { payload } = event;

    await db.delete(todos).where(eq(todos.id, payload.id));
}

export async function handleTodoCompleted(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoCompletedSchema>;
    }
) {
    const { payload } = event;

    // Mark todo completed and set completedAt
    await db
        .update(todos)
        .set({
            completed: true,
            completedAt: new Date(payload.completedAt),
        })
        .where(eq(todos.id, payload.id));

    // Sync to meal step if present
    // We need relations to map step; since completed event is minimal, we rely on existing linkage in mealSteps
    await db
        .update(mealSteps)
        .set({ isStepCompleted: true })
        .where(eq(mealSteps.todoId, payload.id));
}

export async function handleTodoCancelled(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoCancelledSchema>;
    }
) {
    const { payload } = event;

    // Mark todo not completed and clear any meal step linkage
    await db
        .update(todos)
        .set({ completed: false, completedAt: null })
        .where(eq(todos.id, payload.id));

    await db
        .update(mealSteps)
        .set({ isStepCompleted: false, todoId: null })
        .where(eq(mealSteps.todoId, payload.id));
}

// Handler for cross-domain coordination (meal step sync)
export async function handleTodoMealSync(event: any) {
    // Use runtime validation to check if this todo has meal relations
    const payload = event.payload;

    if (!payload.relations || !Array.isArray(payload.relations)) {
        return; // No relations, ignore
    }

    for (const relation of payload.relations) {
        if (relation.mealInstruction) {
            const { mealStepId } = relation.mealInstruction;

            // Update the meal step to sync completion status
            await db
                .update(mealSteps)
                .set({
                    isStepCompleted: payload.completed,
                    todoId: payload.id,
                })
                .where(eq(mealSteps.id, mealStepId));
        }
    }
}
