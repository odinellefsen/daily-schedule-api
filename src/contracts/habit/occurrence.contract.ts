import z from "zod";
import { InstructionKey, YMD } from "./habit.contract";

export const occurrenceSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    domain: z.string(), // "meal"
    entityId: z.string().uuid(), // mealId
    version: z.number().int().positive(), // meal version chosen at generation
    targetDate: YMD, // the event/serving date
    habitId: z.string().uuid().optional(),
    status: z
        .enum(["planned", "active", "completed", "cancelled"])
        .default("planned"),
    createdAt: z.string().datetime(),
});

export const occurrenceStepSchema = z.object({
    occurrenceId: z.string().uuid(),
    key: InstructionKey, // stable within recipeVersion
    title: z.string(), // snapshot of instruction text
    dueDate: YMD, // supports offsets (e.g., -2 days)
    todoId: z.string().uuid().optional(),
    completedAt: z.string().datetime().optional(),
    completedBy: z.string().optional(),
});
