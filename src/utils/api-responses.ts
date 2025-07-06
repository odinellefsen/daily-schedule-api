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
