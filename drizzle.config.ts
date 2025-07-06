import { defineConfig } from "drizzle-kit";
import { zodEnv } from "./env";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dbCredentials: {
        url: zodEnv.POSTGRES_CONNECTION_STRING,
    },
});
