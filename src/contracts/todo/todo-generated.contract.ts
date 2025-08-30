import { z } from "zod";
import { HHMM, InstructionKey, YMD } from "../habit/habit.contract";

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

    // Domain relation
    relation: z.object({
        domain: z.string().min(1),
        entityId: z.string().uuid(),
        version: z.number().int().positive(),
    }),

    // Optional instruction targeting
    instructionKey: InstructionKey.optional(),

    // Snapshot for replay safety
    snapshot: z.unknown(), // Domain-specific snapshot data

    // Event metadata
    eventId: z.string().optional(), // Will be filled by Flowcore
});

export type TodoGeneratedType = z.infer<typeof todoGeneratedSchema>;
