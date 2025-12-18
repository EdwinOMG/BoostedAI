// postgres connection pool
// singleton pool so its shared across imports

import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("DABASE_URL is not set");
}

export const pool = new Pool ({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
})