import { createClient } from "redis"
 // creating redis process
const url = process.env.REDIS_URL;
if (!url) throw new Error("REDIS_URL is not set");

export const redis = createClient({ url })

let connected = false;

export async function ensureRedisConnected(){
    if (connected) return;
    redis.on("error", () => {});
    await redis.connect();
    connected = true;
}