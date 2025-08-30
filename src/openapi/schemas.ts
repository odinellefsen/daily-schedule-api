import { z } from "zod";

// Common response schemas
export const SuccessResponseSchema = z.object({
    ok: z.boolean().default(true),
    message: z.string(),
    data: z.any().optional(),
});

export const ErrorResponseSchema = z.object({
    ok: z.boolean().default(false),
    error: z.string(),
    details: z.any().optional(),
});

// Common parameter schemas
export const UUIDParamSchema = z.object({
    id: z.string().uuid(),
});

// Common query parameter schemas
export const PaginationQuerySchema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
});

// Date and time schemas
export const YMDSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const HHMMSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const WeekdaySchema = z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]);

// Status code constants for OpenAPI responses
export const StatusCodes = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
} as const;
