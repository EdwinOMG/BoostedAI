// postgres connection pool
// singleton pool so its shared across imports

import { Pool } from "pg";

let _pool: Pool | null = null; 

export function getPool() {
    // if its a test, point at a different db, instead of our actual one
    if (_pool) return _pool;
    if (!process.env.DATABASE_URL) {
        throw new Error("DABASE_URL is not set");
    }
    _pool = new Pool ({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
    });

    return _pool;
   
}


export async function closePool() {
    if (_pool) {
        await _pool.end();
        _pool = null;
    }
}

