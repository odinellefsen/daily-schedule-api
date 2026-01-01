import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { todoCompletedSchema } from "../../contracts/todo/todo.completed";
import { db } from "../../db";
import { todos } from "../../db/schemas";

export async function handleTodoCompleted(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof todoCompletedSchema>;
    },
) {
    const { payload } = event;

    await db.delete(todos).where(eq(todos.id, payload.id));
}
