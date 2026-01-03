import { redis, ensureRedisConnected } from "./redisClient";
import { ensureVectorIndex, vectorIndexName, vectorKey } from "./index";

function float32ToBuffer(v: Float32Array) {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
}

export async function upsertConversationVector(params: {
  conversationId: string;
  model: string;
  createdAtMs: number;
  embedding: Float32Array;
  ttlSeconds?: number;
}) {
  await ensureRedisConnected();
  await ensureVectorIndex();

  const key = vectorKey(params.conversationId);
  const ttl = params.ttlSeconds ?? Number(process.env.REDIS_VECTOR_TTL_SECONDS ?? "604800");

  await redis.hSet(key, {
    conversation_id: params.conversationId,
    model: params.model,
    created_at: String(params.createdAtMs),
    embedding: float32ToBuffer(params.embedding)
  });

  await redis.expire(key, ttl);
}

export async function knnSearch(params: {
  queryEmbedding: Float32Array;
  k: number;
  modelFilter?: string;
}) {
  await ensureRedisConnected();
  await ensureVectorIndex();

  const blob = float32ToBuffer(params.queryEmbedding);
  const idx = vectorIndexName();

  const filter = params.modelFilter ? `@model:{${params.modelFilter}}` : "*";
  const q = `${filter}=>[KNN ${params.k} @embedding $vec AS score]`;

  const res = await redis.sendCommand([
    "FT.SEARCH",
    idx,
    q,
    "PARAMS",
    "2",
    "vec",
    blob,
    "SORTBY",
    "score",
    "RETURN",
    "3",
    "conversation_id",
    "model",
    "score",
    "DIALECT",
    "2"
  ]);

  return res;
}
