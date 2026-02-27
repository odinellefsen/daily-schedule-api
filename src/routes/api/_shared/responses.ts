import { z } from "@hono/zod-openapi";

export const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

export function createSuccessResponseSchema<TDataSchema extends z.ZodTypeAny>(
    dataSchema: TDataSchema,
) {
    return z.object({
        success: z.literal(true),
        message: z.string(),
        data: dataSchema,
    });
}
