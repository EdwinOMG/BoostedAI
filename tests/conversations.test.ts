// use our setup test file which allows us to spin up a test db using docker to test ingestconversations

import { beforeAll, beforeEach, afterAll, test, expect } from "vitest";
import { initTestDb } from "./setup";
import { ingestConversation } from "../src/db/conversations";
import { closePool, getPool } from "../src/db/pool";

beforeAll(async () => {
  await initTestDb();
}, 60_000);

beforeEach(async () => {
  await initTestDb();
}, 30_000);

afterAll(async () => {
  await closePool();
});

test("ingestConversation inserts into all tables", async () => {
  const { id } = await ingestConversation({
    model: "chatgpt",
    sourceType: "html_upload",
    sourceReference: "sample.html",
    storageType: "local",
    storageKey: "conversations/sample.html",
    contentHash: null,
    parserVersion: "v1"
  });

  const pool = getPool();

  const c = await pool.query("select * from conversations where id = $1", [id]);
  expect(c.rowCount).toBe(1);

  const s = await pool.query(
    "select * from conversation_sources where conversation_id = $1",
    [id]
  );
  expect(s.rowCount).toBe(1);

  const st = await pool.query(
    "select * from conversation_storage where conversation_id = $1",
    [id]
  );
  expect(st.rowCount).toBe(1);

  const stats = await pool.query(
    "select * from conversation_stats where conversation_id = $1",
    [id]
  );
  expect(stats.rowCount).toBe(1);
});
