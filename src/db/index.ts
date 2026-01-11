import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "../../env";
import * as schema from "./schemas";

let pool: Pool | undefined;
let drizzleDb: Db | undefined;

function initDb() {
    if (drizzleDb) return drizzleDb;

    const env = getEnv();
    pool ??= new Pool({
        connectionString: env.POSTGRES_CONNECTION_STRING,
    });
    drizzleDb = drizzle(pool, { schema });
    return drizzleDb;
}

export type Db = ReturnType<typeof initDb>;

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
