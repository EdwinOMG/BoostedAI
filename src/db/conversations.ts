// db logic for conversations (ingestion and queries)
// how we write a conversation
// what it holds
//what fails
// TRANSACTIONAL BOUNDARY
//easily unit testable, and can be used by anything

// import our pool and uuid for client side id generation
import { getPool } from "./pool";
import { randomUUID } from "crypto";

export type ModelType = "chatgpt" | "claude" | "other";
// restricts allowed models and prevents invalid strings


// defines everything required to ingest a conversation
// easy to add to, single entry point

export type IngestConversationInput = {
  model: ModelType; // what ai produced it
  sourceType: "html_upload" | "api" | "manual"; //how the data entered the system
  sourceReference?: string | null; // pointer to filename, url, or id OPTIONAL
  storageType: "s3" | "local"; // where the full content lives
  storageKey: string; // pointer to blob storage(S3)
  contentHash?: string; // using later on for integrity checks
  parserVersion?: string; // tracks parsing logic version
};

// generates a unique id to use everywhere

export async function ingestConversation(input: IngestConversationInput) {
  const client = await getPool().connect(); // connect to db connection

  try {
    await client.query("BEGIN"); // begin this group of commands 

    if (input.contentHash) {  // if this input already stored, update stats table with last_accessed  and return existingid
      const existing = await client.query(
        `SELECT conversation_id
         FROM conversation_storage
         WHERE content_hash = $1
         LIMIT 1`,
        [input.contentHash]
      );

      if (existing.rowCount === 1) {
        const existingId = existing.rows[0].conversation_id as string;

        await client.query(
          `UPDATE conversation_stats
           SET last_accessed = NOW()
           WHERE conversation_id = $1`,
          [existingId]
        );

        await client.query("COMMIT");
        return { id: existingId, deduped: true };
      }
    }

    const id = randomUUID();  // else if not in db already, create an id, and insert content into the tables
    const parserVersion = input.parserVersion ?? "v1";

    await client.query(
      `INSERT INTO conversations (id, model) VALUES ($1, $2)`,
      [id, input.model]
    );

    await client.query(
      `INSERT INTO conversation_sources (conversation_id, source_type, source_reference)
       VALUES ($1, $2, $3)`,
      [id, input.sourceType, input.sourceReference ?? null]
    );

    await client.query(
      `INSERT INTO conversation_storage (conversation_id, storage_type, storage_key, content_hash, parser_version)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, input.storageType, input.storageKey, input.contentHash, parserVersion]
    );

    await client.query(
      `INSERT INTO conversation_stats (conversation_id) VALUES ($1)`,
      [id]
    );


    await client.query(
      `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload)
      VALUES ($1, $2, $3, $4)`,
      [
        "CONVERSATION_INGESTED",
        "conversation",
        id,
        {
          model: input.model,
          storageType: input.storageType,
          storageKey: input.storageKey,
          contentHash: input.contentHash ?? null
        }
      ]
    );

    await client.query("COMMIT");
    return { id, deduped: false };
  } catch (e: any) {
    await client.query("ROLLBACK"); // rollback all of it if there is an error

    if (e?.code === "23505" && input.contentHash) {
      const client2 = await getPool().connect();
      try {
        const existing = await client2.query(
          `SELECT conversation_id
           FROM conversation_storage
           WHERE content_hash = $1
           LIMIT 1`,
          [input.contentHash]
        );
        if (existing.rowCount === 1) {
          return { id: existing.rows[0].conversation_id as string, deduped: true };
        }
      } finally {
        client2.release();
      }
    }

    throw e;
  } finally {
    client.release();
  }
}