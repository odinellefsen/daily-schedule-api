import { z } from "@hono/zod-openapi";

// Common response schemas
export const ApiResponseSchema = z
    .object({
        ok: z.boolean(),
        message: z.string(),
        data: z.any().optional(),
        errors: z.array(z.any()).optional(),
    })
    .openapi({
        title: "ApiResponse",
        description: "Standard API response format",
    });

export const ErrorResponseSchema = z
    .object({
        ok: z.literal(false),
        message: z.string(),
        errors: z
            .array(
                z.object({
                    path: z.string(),
                    message: z.string(),
                    code: z.string(),
                }),
            )
            .optional(),
    })
    .openapi({
        title: "ErrorResponse",
        description: "Error response format",
    });

// Common parameter schemas
export const UUIDParamSchema = z.object({
    id: z.string().uuid().openapi({
        description: "UUID identifier",
        example: "550e8400-e29b-41d4-a716-446655440000",
    }),
});

// Date and time schemas with OpenAPI metadata
export const YMD = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .openapi({
        title: "Date",
        description: "Date in YYYY-MM-DD format",
        example: "2024-01-15",
    });

export const HHMM = z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .openapi({
        title: "Time",
        description: "Time in HH:MM format (24-hour)",
        example: "14:30",
    });

export const Weekday = z
    .enum([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ])
    .openapi({
        title: "Weekday",
        description: "Day of the week",
        example: "monday",
    });

// Pagination schemas
export const PaginationQuerySchema = z.object({
    page: z
        .string()
        .transform(Number)
        .pipe(z.number().int().min(1))
        .optional()
        .openapi({
            description: "Page number (starts from 1)",
            example: "1",
        }),
    limit: z
        .string()
        .transform(Number)
        .pipe(z.number().int().min(1).max(100))
        .optional()
        .openapi({
            description: "Number of items per page (max 100)",
            example: "20",
        }),
});

export const PaginationResponseSchema = z
    .object({
        page: z.number().int().min(1),
        limit: z.number().int().min(1),
        total: z.number().int().min(0),
        totalPages: z.number().int().min(0),
    })
    .openapi({
        title: "Pagination",
        description: "Pagination metadata",
    });

// Helper function to create standardized success response
export const createSuccessResponseSchema = <T extends z.ZodType>(
    dataSchema: T,
    description: string,
) =>
    z
        .object({
            ok: z.literal(true),
            message: z.string(),
            data: dataSchema,
        })
        .openapi({
            title: "SuccessResponse",
            description,
        });

// Helper function to create standardized list response
export const createListResponseSchema = <T extends z.ZodType>(
    itemSchema: T,
    description: string,
) =>
    z
        .object({
            ok: z.literal(true),
            message: z.string(),
            data: z.array(itemSchema),
            pagination: PaginationResponseSchema.optional(),
        })
        .openapi({
            title: "ListResponse",
            description,
        });
