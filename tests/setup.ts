import "dotenv/config";
import { readFile } from "fs/promises";
import path from "path";
import { Client } from "pg";

let initialized = false;

export async function initTestDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set");
  }

  process.env.DATABASE_URL = url;

  const client = new Client({ connectionString: url });
  await client.connect();

  if (!initialized) {
    const schemaPath = path.resolve(process.cwd(), "db", "schema.sql");
    const schemaSql = await readFile(schemaPath, "utf-8");
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await client.query(schemaSql);
    initialized = true;
  }

 

  await client.end();
}
