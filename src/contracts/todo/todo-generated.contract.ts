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
    occurrenceId: z.string().uuid(),

    // Direct instruction reference (simplified)
    instructionId: z.string().uuid(),
    mealId: z.string().uuid(), // For meal context

    // Event metadata
    eventId: z.string().optional(), // Will be filled by Flowcore
});

export type TodoGeneratedType = z.infer<typeof todoGeneratedSchema>;
