import { z } from "zod";

export const todoCompletedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    completedAt: z.string().datetime().optional(),
});
