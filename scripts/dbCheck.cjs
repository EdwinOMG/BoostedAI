require("dotenv/config");
const { Pool } = require("pg");

(async () => {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });

  const r = await p.query(`
    select
      inet_server_addr() as server_addr,
      inet_server_port() as server_port,
      current_database() as db,
      currentOpening_schema() as schema,
      current_user as usr,
      version() as version,
      to_regclass('public.outbox_events') as outbox_regclass
  `);

  console.log("DATABASE_URL =", process.env.DATABASE_URL);
  console.log(r.rows[0]);

  const t = await p.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_name = 'outbox_events'
    order by table_schema;
  `);

  console.log("tables named outbox_events:", t.rows);

  await p.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
