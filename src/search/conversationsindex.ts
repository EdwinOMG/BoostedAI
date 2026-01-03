import { osClient } from "./opensearchClient";
// creates index
const indexName = process.env.OPENSEARCH_INDEX_CONVERSATIONS ?? "boostedai_conversations";


// make sure that the index(search table) exists
export async function ensureConversationsIndex() {
    const exists = await osClient.indices.exists({ index: indexName });
    if (exists.body === true) return;
    //indexes document into storage for retrieval using tokens and inverted indexing
    await osClient.indices.create({
        index: indexName,
        body: {
        settings: {
            index: {
            number_of_shards: 1,
            number_of_replicas: 0
            }
        },
        mappings: {
            properties: {
            id: { type: "keyword" },
            model: { type: "keyword" },
            source_type: { type: "keyword" },
            source_reference: { type: "keyword" },
            storage_type: { type: "keyword" },
            storage_key: { type: "keyword" },
            content_hash: { type: "keyword" },
            parser_version: { type: "keyword" },
            created_at: { type: "date" },

            text: {
                type: "text"
            }
            }
        }
        }
    });
}

export function conversationsIndexName() {
    return indexName;
}
