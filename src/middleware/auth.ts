import { verifyToken } from "@clerk/backend";
import type { Context, Next } from "hono";
import { zodEnv } from "../../env";
import { ApiResponse, StatusCodes } from "../utils/api-responses";

const CLERK_VERIFY_TIMEOUT_MS = 8000;

async function verifyTokenWithTimeout(token: string, secretKey: string) {
    return await Promise.race([
        verifyToken(token, { secretKey }),
        new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(
                    new Error(
                        `Clerk token verification timed out after ${CLERK_VERIFY_TIMEOUT_MS}ms`,
                    ),
                );
            }, CLERK_VERIFY_TIMEOUT_MS);
        }),
    ]);
}

export interface ClerkUser {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    emailAddresses?: Array<{
        emailAddress: string;
        isPrimary: boolean;
    }>;
}

// Extend Hono context to include authenticated user
declare module "hono" {
    interface Context {
        user?: ClerkUser;
        userId?: string;
    }
}

/**
 * Clerk JWT Authentication Middleware for Hono
 * Verifies JWT tokens from Authorization header and attaches user info to context
 */
export const clerkAuth = () => {
    return async (c: Context, next: Next) => {
        try {
            // Never require auth on CORS preflight requests.
            if (c.req.method === "OPTIONS") {
                await next();
                return;
            }

            // Extract Bearer token from Authorization header
            const authHeader = c.req.header("Authorization");
            if (!authHeader?.startsWith("Bearer ")) {
                return c.json(
                    ApiResponse.error(
                        "Authorization header with Bearer token is required",
                    ),
                    StatusCodes.UNAUTHORIZED,
                );
            }

            // Removing "Bearer " prefix
            const token = authHeader.substring(7);

            // Verify the JWT token with Clerk
            const payload = await verifyTokenWithTimeout(
                token,
                zodEnv.CLERK_SECRET_KEY,
            );

            if (!payload || !payload.sub) {
                return c.json(
                    ApiResponse.error("Invalid or expired token"),
                    StatusCodes.UNAUTHORIZED,
                );
            }

            // Attach user ID to context for use in route handlers
            c.userId = payload.sub;

            // Optional: Fetch full user details from Clerk if needed
            // This can be done lazily in route handlers to avoid extra API calls
            await next();
        } catch (error) {
            console.error("Authentication error:", error);

            const message =
                error instanceof Error &&
                error.message.includes("timed out after")
                    ? "Authentication service timed out"
                    : "Authentication failed";

            const statusCode =
                message === "Authentication service timed out"
                    ? StatusCodes.SERVICE_UNAVAILABLE
                    : StatusCodes.UNAUTHORIZED;

            return c.json(
                ApiResponse.error(message, error),
                statusCode,
            );
        }
    };
};

export const requireAuth = clerkAuth;

/**
 * Optional middleware for routes where auth is optional
 * Attaches user if token is provided, but doesn't fail if missing
 */
export const optionalAuth = () => {
    return async (c: Context, next: Next) => {
        const authHeader = c.req.header("Authorization");

        // If no auth header, continue without user context
        if (!authHeader?.startsWith("Bearer ")) {
            await next();
            return;
        }

        try {
            const token = authHeader.substring(7);
            const payload = await verifyToken(token, {
                secretKey: zodEnv.CLERK_SECRET_KEY,
            });

            if (payload?.sub) {
                c.userId = payload.sub;
            }
        } catch (error) {
            // Log error but don't fail the request
            console.warn("Optional auth failed:", error);
        }

        await next();
    };
};
