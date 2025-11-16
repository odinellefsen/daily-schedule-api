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

type SuccessResponse<T> = {
    success: true;
    message: string;
    data: T;
};

type SuccessResponseWithoutData = {
    success: true;
    message: string;
};

type ErrorResponse = {
    success: false;
    message: string;
    errors?: unknown;
};

function success<T>(message: string, data: T): SuccessResponse<T>;
function success(message: string): SuccessResponseWithoutData;
function success<T>(message: string, data?: T): SuccessResponse<T> | SuccessResponseWithoutData {
    if (data !== undefined) {
        return {
            success: true,
            message,
            data,
        };
    }
    return {
        success: true,
        message,
    };
}

function error(message: string, errors?: unknown): ErrorResponse {
    return {
        success: false,
        message,
        errors,
    };
}

export const ApiResponse = {
    success,
    error,
};
