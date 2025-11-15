import crypto from "node:crypto";
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
import { todos } from "../../db/schemas";

export async function handleTodoCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoSchema>;
    },
) {
    const { payload } = event;

    await db.insert(todos).values({
        id: payload.id,
        userId: payload.userId,
        title: payload.description,
        description: payload.description,
        completed: payload.completed,
        scheduledFor: payload.scheduledFor
            ? (() => {
                  const date = new Date(payload.scheduledFor);
                  if (Number.isNaN(date.getTime())) {
                      throw new Error(
                          `Invalid scheduledFor date: ${payload.scheduledFor}`,
                      );
                  }
                  return date;
              })()
            : null,
        completedAt: payload.completedAt
            ? (() => {
                  const date = new Date(payload.completedAt);
                  if (Number.isNaN(date.getTime())) {
                      throw new Error(
                          `Invalid completedAt date: ${payload.completedAt}`,
                      );
                  }
                  return date;
              })()
            : null,
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
            completedAt: (() => {
                const date = new Date(payload.completedAt);
                if (Number.isNaN(date.getTime())) {
                    throw new Error(
                        `Invalid completedAt date: ${payload.completedAt}`,
                    );
                }
                return date;
            })(),
        })
        .where(eq(todos.id, payload.id));

    // Get the completed todo to understand context
    const completedTodo = await db.query.todos.findFirst({
        where: eq(todos.id, payload.id),
    });

    if (!completedTodo) {
        console.warn(`Todo ${payload.id} not found after completion`);
        return;
    }

    // Todo completion handling - occurrence tracking removed
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

    // Validate scheduledFor date
    const scheduledForDate = new Date(payload.scheduledFor);
    if (Number.isNaN(scheduledForDate.getTime())) {
        throw new Error(`Invalid scheduledFor date: ${payload.scheduledFor}`);
    }

    // UPSERT the todo (simplified structure)
    await db
        .insert(todos)
        .values({
            id: todoId,
            userId: payload.userId,
            title: payload.title,
            description: payload.title, // Use title as description for compatibility
            dueDate: payload.dueDate,
            preferredTime: payload.preferredTime || null,
            completed: false,
            scheduledFor: payload.scheduledFor
                ? (() => {
                      const date = new Date(payload.scheduledFor);
                      if (Number.isNaN(date.getTime())) {
                          throw new Error(
                              `Invalid scheduledFor date: ${payload.scheduledFor}`,
                          );
                      }
                      return date;
                  })()
                : null,
            completedAt: null,

            // Simplified habit system fields
            habitId: payload.habitId,
            instanceId: payload.instanceId,
            domain: payload.domain,
            entityId: payload.entityId,
            subEntityId: payload.subEntityId,

            // Legacy fields
            relations: null,
            eventId: event.eventId,
        })
        .onConflictDoNothing({
            target: [todos.userId, todos.habitId, todos.dueDate],
        });

    // No more occurrence steps needed - direct instruction reference!
}
