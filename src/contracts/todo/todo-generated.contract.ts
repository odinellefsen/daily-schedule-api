import { z } from "zod";
import { mealInstructionRelationSchema } from "./todo.contract";

export const todoGeneratedSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    description: z
        .string()
        .min(1, "Description is required")
        .max(250, "Description must be less than 250 characters"),
    completed: z.boolean().default(false),
    scheduledFor: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),

    // Optional relations - extensible for future domains (fitness, shopping, bills, maintenance, etc.)
    // in the future, when there are more available domains, make it into a union type
    relations: z
        .array(
            z.object({
                mealInstruction: mealInstructionRelationSchema,
            }),
        )
        .min(
            1,
            "if relations is NOT undefined, you must have at least one relation",
        )
        .max(5, "you can only have up to 5 relations")
        .optional(),
});

export type TodoGeneratedType = z.infer<typeof todoGeneratedSchema>;
