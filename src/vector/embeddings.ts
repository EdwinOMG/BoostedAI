import { createHash } from "crypto";

const dim = Number(process.env.REDIS_VECTOR_DIM ?? "256");

export type Embedder = {
  embed(text: string): Promise<Float32Array>;
};

export const devEmbedder: Embedder = {
  async embed(text: string) {
    const h = createHash("sha256").update(text, "utf8").digest();
    const v = new Float32Array(dim);
    for (let i = 0; i < dim; i++) {
      const b = h[i % h.length];
      v[i] = (b / 255) * 2 - 1;
    }
    return v;
  }
};
