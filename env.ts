import { z } from "zod";

export const envSchema = z.object({
    POSTGRES_CONNECTION_STRING: z.string(),
    FLOWCORE_TENANT: z.string(),
    FLOWCORE_DATA_CORE_NAME: z.string(),
    FLOWCORE_WEBHOOK_API_KEY: z.string(),
    FLOWCORE_WEBHOOK_BASE_URL: z.string(),
    CLERK_SECRET_KEY: z.string(),
    LOCAL_IP: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
    if (cachedEnv) return cachedEnv;

    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const fields = parsed.error.issues
            .map((i) => i.path.join(".") || "(root)")
            .join(", ");

        // Don't crash at import-time; throw only when env is actually needed.
        // Vercel will still return 500, but it won't show "Function has crashed" for everything.
        const message = `Missing/invalid required environment variables: ${fields}`;
        console.error(message, parsed.error.flatten());
        throw new Error(message);
    }

    cachedEnv = parsed.data;
    return cachedEnv;
}

// Convenience accessor that keeps existing call-sites readable.
// IMPORTANT: don't read env at module top-level in other modules (that would still crash on cold start).
export const zodEnv: Env = new Proxy({} as Env, {
    get(_target, prop) {
        return getEnv()[prop as keyof Env];
    },
}) as Env;
