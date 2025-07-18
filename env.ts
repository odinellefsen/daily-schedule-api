import { z } from "zod";

export const envSchema = z.object({
    POSTGRES_CONNECTION_STRING: z.string(),
    FLOWCORE_TENANT: z.string(),
    FLOWCORE_DATA_CORE_NAME: z.string(),
    FLOWCORE_WEBHOOK_API_KEY: z.string(),
    FLOWCORE_WEBHOOK_BASE_URL: z.string(),
});

export const zodEnv = envSchema.parse(process.env);
