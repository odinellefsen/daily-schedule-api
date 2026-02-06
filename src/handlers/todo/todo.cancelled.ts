import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { todoCancelledSchema } from "../../contracts/todo";
import { db } from "../../db";
import { todos } from "../../db/schemas";

export async function handleTodoCancelled(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoCancelledSchema>;
    },
) {
    const { payload } = event;

    await db.delete(todos).where(eq(todos.id, payload.id));
}
