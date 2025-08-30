import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type {
    todoArchiveSchema,
    todoCancelledSchema,
    todoCompletedSchema,
    todoGeneratedSchema,
    todoRelationsUpdatedSchema,
    todoSchema,
} from "../../contracts/todo";
import { db } from "../../db";
import { mealSteps, occurrenceSteps, todos } from "../../db/schemas";

export async function handleTodoCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoSchema>;
    },
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
    },
) {
    const { payload } = event;

    await db.delete(todos).where(eq(todos.id, payload.id));
}

export async function handleTodoCompleted(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoCompletedSchema>;
    },
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
    },
) {
    const { payload } = event;

    // Delete todo
    await db.delete(todos).where(eq(todos.id, payload.id));
}

export async function handleTodoRelationsUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoRelationsUpdatedSchema>;
    },
) {
    const { payload } = event;

    await db
        .update(todos)
        .set({ relations: JSON.stringify(payload.relations) })
        .where(eq(todos.id, payload.id));
}

export async function handleTodoGenerated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoGeneratedSchema>;
    },
) {
    const { payload } = event;

    // Generate new UUID for the todo
    const todoId = crypto.randomUUID();

    // UPSERT the todo (idempotent using natural business key)
    await db
        .insert(todos)
        .values({
            id: todoId,
            userId: payload.userId,
            title: payload.title,
            dueDate: payload.dueDate,
            preferredTime: payload.preferredTime || null,
            completed: false,
            habitId: payload.habitId,
            occurrenceId: payload.occurrenceId,
            relation: JSON.stringify(payload.relation),
            instructionKey: payload.instructionKey
                ? JSON.stringify(payload.instructionKey)
                : null,
            snapshot: JSON.stringify(payload.snapshot),
            eventId: event.eventId,
            // Set precise scheduling for habit-generated todos
            description: payload.title, // Fallback for compatibility
            scheduledFor: new Date(payload.scheduledFor),
            completedAt: null,
            relations: null,
        })
        .onConflictDoNothing({
            target: [
                todos.userId,
                todos.habitId,
                todos.dueDate,
                todos.instructionKey,
            ],
        });

    // If this is an instruction-based todo, ensure the occurrence step exists
    if (payload.instructionKey) {
        await db
            .insert(occurrenceSteps)
            .values({
                id: crypto.randomUUID(),
                occurrenceId: payload.occurrenceId,
                recipeId: payload.instructionKey.recipeId,
                recipeVersion: payload.instructionKey.recipeVersion,
                instructionId: payload.instructionKey.instructionId,
                title: payload.title,
                dueDate: payload.dueDate,
                todoId: todoId,
            })
            .onConflictDoNothing({
                target: [
                    occurrenceSteps.occurrenceId,
                    occurrenceSteps.recipeId,
                    occurrenceSteps.recipeVersion,
                    occurrenceSteps.instructionId,
                ],
            });
    }
}
