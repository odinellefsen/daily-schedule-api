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
    envRejectUnauthorized?: "true" | "false",
    caCert?: string,
) {
    const connectionUrl = new URL(normalizeConnectionString(connectionString));
    const hostname = connectionUrl.hostname.toLowerCase();
    const isLocalHost =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1";

    if (isLocalHost) return undefined;

    const sslMode = connectionUrl.searchParams.get("sslmode")?.toLowerCase();
    const rejectUnauthorized =
        envRejectUnauthorized === "true"
            ? true
            : envRejectUnauthorized === "false"
              ? false
              : sslMode === "no-verify"
                ? false
                : true;

    if (caCert) {
        return { rejectUnauthorized, ca: caCert.replace(/\\n/g, "\n") };
    }

    return { rejectUnauthorized };
}

function initDb(): Db {
    if (drizzleDb) return drizzleDb;

    const env = getEnv();
    const connectionString = normalizeConnectionString(
        env.POSTGRES_CONNECTION_STRING,
    );

    pool ??= new Pool({
        connectionString,
        ssl: getPoolSslConfig(
            connectionString,
            env.POSTGRES_SSL_REJECT_UNAUTHORIZED,
            env.POSTGRES_SSL_CA_CERT,
        ),
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
