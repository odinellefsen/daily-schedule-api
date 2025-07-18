import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { zodEnv } from "../../env";
import * as schema from "./schemas";

const pool = new Pool({
    connectionString: zodEnv.POSTGRES_CONNECTION_STRING,
});

export const db = drizzle(pool, { schema });
