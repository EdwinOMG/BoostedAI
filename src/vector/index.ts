import { redis, ensureRedisConnected } from "./redisClient";

const indexName = process.env.REDIS_VECTOR_INDEX ?? "idx:conversations";
const prefix = process.env.REDIS_VECTOR_PREFIX ?? "conv:";
const dim = Number(process.env.REDIS_VECTOR_DIM ?? "256");

export function vectorIndexName() {
    return indexName;
}


export function vectorKey(conversationId: string) {
  return `${prefix}${conversationId}`;
}

export async function ensureVectorIndex() {
    await ensureRedisConnected();

    try {
        await redis.sendCommand(["FT.INFO", indexName]);
        return;
    } catch {}

    await redis.sendCommand([
    "FT.CREATE",
    indexName,
    "ON",
    "HASH",
    "PREFIX",
    "1",
    prefix,
    "SCHEMA",
    "conversation_id",
    "TEXT",
    "model",
    "TAG",
    "created_at",
    "NUMERIC",
    "embedding",
    "VECTOR",
    "HNSW",
    "6",
    "TYPE",
    "FLOAT32",
    "DIM",
    String(dim),
    "DISTANCE_METRIC",
    "COSINE"
]);

}