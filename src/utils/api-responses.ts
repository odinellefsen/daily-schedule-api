export const StatusCodes = {
    // 2xx Success
    CREATED: 201, // Resource successfully created
    OK: 200, // Request successful
    ACCEPTED: 202, // Request accepted for processing
    NO_CONTENT: 204, // Successful deletion/update with no response body

    // 4xx Client Errors
    BAD_REQUEST: 400, // Invalid request data/validation failed
    UNAUTHORIZED: 401, // Authentication required
    FORBIDDEN: 403, // Permission denied
    NOT_FOUND: 404, // Resource doesn't exist
    CONFLICT: 409, // Resource already exists/version conflict
    UNPROCESSABLE: 422, // Valid format but business logic error

    // 5xx Server Errors
    SERVER_ERROR: 500, // Unexpected server error
    SERVICE_UNAVAILABLE: 503, // External service down (e.g., Flowcore)
} as const;

export const ApiResponse = {
    success: (message: string, data?: unknown) => ({
        success: true,
        message,
        ...(data !== undefined && data !== null ? { data } : {}),
    }),

    error: (message: string, errors?: unknown) => ({
        success: false,
        message,
        ...(errors !== undefined && errors !== null ? { errors } : {}),
    }),
};
