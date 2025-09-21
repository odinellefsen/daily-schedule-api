import { z } from "zod";
import { HHMM, YMD } from "../habit/habit.contract";

export const todoGeneratedSchema = z.object({
    // Basic todo fields
    userId: z.string().min(1),
    title: z.string().min(1),
    dueDate: YMD, // YYYY-MM-DD
    preferredTime: HHMM.optional(), // HH:MM
    scheduledFor: z.string().datetime(), // UTC timestamp for precise scheduling
    timezone: z.string().optional(), // User's timezone context

    // Habit system linkage
    habitId: z.string().uuid(),

    // Domain-agnostic reference (optional for plain text habits)
    domain: z.string().optional(), // e.g., "meal", "workout", null for text habits
    entityId: z.string().uuid().optional(), // e.g., mealId, workoutId
    subEntityId: z.string().uuid().optional(), // e.g., instructionId, exerciseId

    // Event metadata
    eventId: z.string().optional(), // Will be filled by Flowcore
});

export type TodoGeneratedType = z.infer<typeof todoGeneratedSchema>;
