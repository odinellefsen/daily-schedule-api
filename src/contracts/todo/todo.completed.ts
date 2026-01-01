import { z } from "zod";

export const todoCompletedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
});

export type TodoCompletedType = z.infer<typeof todoCompletedSchema>;
