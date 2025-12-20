// worker consumes outbox events and then indexes

import "dotenv/config";
import { getPool } from "../db/pool";
import { osClient } from "../search/opensearchClient";
import { ensureConversationsIndex, conversationsIndexName } from "../search/conversationsindex";

// this is what is in each outboxevent row
type OutboxRow = {
    id: number;
    event_type: string;
    aggregate_type: string;
    aggregate_id: string;
    payload: any;
};

async function fetchConversationForIndex(conversationId: string) {
    const pool = getPool(); // get connection to db

    const meta = await pool.query( // our worker collects ids that need to be processed 
        `SELECT c.id, c.model, c.created_at,
            s.source_type, s.source_reference,
            st.storage_type, st.storage_key, st.content_hash, st.parser_version
     FROM conversations c
     JOIN conversation_sources s ON s.conversation_id = c.id
     JOIN conversation_storage st ON st.conversation_id = c.id
     WHERE c.id = $1
     LIMIT 1`,
    [conversationId]
     );
    
     // if there is none, then stop
     if (meta.rowCount === 0) return null;
     const row = meta.rows[0];

     // if there is a event that needs to be processed, return the rows data
     return {
        id: row.id,
        model: row.model,
        created_at: row.created_at,
        source_type: row.source_type,
        source_reference: row.source_reference,
        storage_type: row.storage_type,
        storage_key: row.storage_key,
        content_hash: row.content_hash,
        parser_version: row.parser_version,
        text: ""
    };
}

// indexs conversation
async function indexConversation(doc: any) {
    await osClient.index({
        index: conversationsIndexName(),
        id: doc.id,
        body:doc,
        refresh: false
    })
}


async function main() {
    await ensureConversationsIndex(); // makes sure conversation index is created

    const pool = getPool(); // get db connection

    while (true) {
        const client = await pool.connect(); // connect to db connection
        try {
            await client.query("BEGIN"); // begin group query

            const { rows } = await client.query<OutboxRow>( // get up to 10 rows of events that need to be processed
                `SELECT id, event_type, aggregate_type, aggregate_id, payload
                FROM outbox_events
                WHERE processed_at IS NULL
                ORDER BY created_at
                LIMIT 10
                FOR UPDATE SKIP LOCKED`
            );

            if (rows.length === 0) { // if none then commit and release connection
                await client.query("COMMIT");
                client.release();
                await new Promise((r) => setTimeout(r, 500));
                continue;
            }

            for (const evt of rows) { // for each row received
        try {
          if (evt.event_type === "CONVERSATION_INGESTED" && evt.aggregate_type === "conversation") {
            const doc = await fetchConversationForIndex(evt.aggregate_id); // grab the id of the row
            if (doc) await indexConversation(doc); // index the conversation
          }

          await client.query(`UPDATE outbox_events SET processed_at = NOW() WHERE id = $1`, [evt.id]); 
        } catch (err: any) {
          await client.query(
            `UPDATE outbox_events
             SET attempts = attempts + 1,
                 last_error = $2
             WHERE id = $1`,
            [evt.id, String(err?.message ?? err)]
          );
        }
      }

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});