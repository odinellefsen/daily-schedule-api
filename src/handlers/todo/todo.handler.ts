import type { FlowcoreEvent } from "@flowcore/pathways";
import type { z } from "zod";
import type { todoSchema } from "../../contracts/todo";
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
