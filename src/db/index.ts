import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "../../env";
import * as schema from "./schemas";

let pool: Pool | undefined;
let drizzleDb: Db | undefined;

export type Db = NodePgDatabase<typeof schema>;

function normalizeConnectionString(raw: string): string {
    const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
    const withoutPrefix = trimmed.replace(
        /^POSTGRES_CONNECTION_STRING=/i,
        "",
    );
    return withoutPrefix.trim();
}

function getPoolSslConfig(
    connectionString: string,
) {
    const connectionUrl = new URL(normalizeConnectionString(connectionString));
    const hostname = connectionUrl.hostname.toLowerCase();
    const isLocalHost =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1";

    if (isLocalHost) return undefined;

    const sslMode = connectionUrl.searchParams.get("sslmode")?.toLowerCase();
    // Map postgres sslmode semantics for Node TLS behavior.
    // Supabase URLs commonly use sslmode=require, which should not enforce CA verification.
    switch (sslMode) {
        case "disable":
            return false;
        case "allow":
        case "prefer":
        case "require":
        case "no-verify":
            return { rejectUnauthorized: false };
        case "verify-ca":
        case "verify-full":
            return { rejectUnauthorized: true };
        default:
            // Secure default when sslmode is omitted.
            return { rejectUnauthorized: true };
    }
}

function initDb(): Db {
    if (drizzleDb) return drizzleDb;

    const env = getEnv();
    const connectionString = normalizeConnectionString(
        env.POSTGRES_CONNECTION_STRING,
    );

    pool ??= new Pool({
        connectionString,
        ssl: getPoolSslConfig(connectionString),
    });
    drizzleDb = drizzle(pool, { schema });
    return drizzleDb;
}

// Keep the existing `db` import shape, but make initialization lazy so `/health`
// can respond even if env vars are missing/misconfigured on cold start.
export const db: Db = new Proxy({} as Db, {
    get(_target, prop) {
        const instance = initDb();
        const value = instance[prop as keyof Db];
        // Bind functions so `this` works correctly when methods are invoked from the proxy.
        return typeof value === "function" ? value.bind(instance) : value;
    },
}) as Db;
