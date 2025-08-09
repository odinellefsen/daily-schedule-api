import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    todoArchiveSchema,
    todoCancelledSchema,
    todoCompletedSchema,
    todoSchema,
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
