// ------------------------------------------------------------
// Embedding generation using the Vercel AI SDK + OpenAI.
//
// Model: text-embedding-3-small (1536 dims) — must match the
// vector size declared in src/lib/qdrant/config.ts.
// ------------------------------------------------------------

import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const EMBED_MODEL = "text-embedding-3-small";

// Single-vector path — used by chat retrieval for the rewritten query.
export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding(EMBED_MODEL),
    value: text,
  });
  return embedding;
}

// Batch path — used by the processing pipeline. OpenAI accepts up to
// 2048 inputs per request, but we cap our batch size at 96 to stay
// comfortably under the per-request token limit for very large chunks.
const EMBED_BATCH_SIZE = 96;

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const { embeddings } = await embedMany({
      model: openai.embedding(EMBED_MODEL),
      values: batch,
    });
    out.push(...embeddings);
  }
  return out;
}
