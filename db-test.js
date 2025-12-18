const { Pool } = require("pg") // Make a pool that requires postgres node driver

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Make sure .env exists in the project root.");
  process.exit(1);
}

const pool = new Pool ({ // pool variable which establishes database connections
    connectionString: process.env.DATABASE_URL
});

async function main() {
  const res = await pool.query("select now() as now");
  console.log("rowCount:", res.rowCount);
  console.log("rows:", res.rows);
  console.log("now:", res.rows?.[0]?.now ?? null);
  await pool.end();
}


main().catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1)
});