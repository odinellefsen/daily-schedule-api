import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "../../env";
import * as schema from "./schemas";

let pool: Pool | undefined;
let drizzleDb: Db | undefined;

export type Db = NodePgDatabase<typeof schema>;

function getPoolSslConfig(
    connectionString: string,
    envRejectUnauthorized?: "true" | "false",
    caCert?: string,
) {
    const connectionUrl = new URL(connectionString);
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

    pool ??= new Pool({
        connectionString: env.POSTGRES_CONNECTION_STRING,
        ssl: getPoolSslConfig(
            env.POSTGRES_CONNECTION_STRING,
            env.POSTGRES_SSL_REJECT_UNAUTHORIZED,
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
