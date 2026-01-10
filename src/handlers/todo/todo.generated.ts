import type { FlowcoreEvent } from "@flowcore/pathways";
import type { z } from "zod";
import type { todoGeneratedSchema } from "../../contracts/todo";
import { db } from "../../db";
import { todos } from "../../db/schemas";

export async function handleTodoGenerated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoGeneratedSchema>;
    },
) {
    const { payload } = event;

    await db.insert(todos).values({
        id: payload.id,
        userId: payload.userId,
        title: payload.title,
        dueDate: payload.dueDate,
        preferredTime: payload.preferredTime,
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
        habitId: payload.habitId,
        instanceId: payload.instanceId,
        domain: payload.domain,
        entityId: payload.entityId,
        subEntityId: payload.subEntityId,
        eventId: payload.eventId,
    });
}
