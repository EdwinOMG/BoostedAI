// db logic for conversations (ingestion and queries)
// how we write a conversation
// what it holds
//what fails
// TRANSACTIONAL BOUNDARY
//easily unit testable, and can be used by anything

// import our pool and uuid for client side id generation
import { pool } from "./pool";
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
  contentHash?: string | null; // using later on for integrity checks
  parserVersion?: string; // tracks parsing logic version
};

// generates a unique id to use everywhere

export async function ingestConversation(input: IngestConversationInput) {
  const id = randomUUID();
  const parserVersion = input.parserVersion ?? "v1";

  const client = await pool.connect(); // single dedicated connection
  try {
    await client.query("BEGIN"); // treat the following operations as one unit

    await client.query( // the anchor row, everything references our main table 
      `INSERT INTO conversations (id, model) VALUES ($1, $2)`,
      [id, input.model]
    );

    await client.query( // insert source metadata, multiple sources per conversation
      `INSERT INTO conversation_sources (conversation_id, source_type, source_reference)
       VALUES ($1, $2, $3)`,
      [id, input.sourceType, input.sourceReference ?? null]
    );

    await client.query( //decouples db identity and blob content
      `INSERT INTO conversation_storage (conversation_id, storage_type, storage_key, content_hash, parser_version)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, input.storageType, input.storageKey, input.contentHash ?? null, parserVersion]
    );

    await client.query( // prevents null checks
      `INSERT INTO conversation_stats (conversation_id) VALUES ($1)`,
      [id]
    );

    await client.query("COMMIT"); // id is valid everywhere and can proceed safely
    return { id };
  } catch (e) {
    await client.query("ROLLBACK"); // db state resets, no partial writes and no corruption
    throw e;
  } finally {
    client.release(); //release connection to prevent exhaustion, deadlocks, and outages
  }
}