import { getQdrantClient } from "./client";
import { qdrantConfig } from "./config";
import type { ChunkPayload } from "@/types/doc";

// ------------------------------------------------------------
// Read/write helpers for the rag-chatbot-docs collection.
// Every operation is scoped to a single user via payload filter
// — this is the security boundary between tenants.
// ------------------------------------------------------------

export interface RetrievedChunk extends ChunkPayload {
  score: number;
}

// Insert a batch of vector points belonging to a single doc.
// Caller supplies pre-computed embeddings (one per chunk).
export async function upsertDocChunks(params: {
  pointIds: string[];
  embeddings: number[][];
  payloads: ChunkPayload[];
}) {
  const client = getQdrantClient();

  if (
    params.pointIds.length !== params.embeddings.length ||
    params.embeddings.length !== params.payloads.length
  ) {
    throw new Error("Mismatched lengths: pointIds / embeddings / payloads");
  }

  await client.upsert(qdrantConfig.collectionName, {
    wait: true,
    points: params.pointIds.map((id, i) => ({
      id,
      vector: params.embeddings[i],
      payload: params.payloads[i] as unknown as Record<string, unknown>,
    })),
  });
}

// Remove every point belonging to a single doc. Called from the
// deleteDocAction server action. Also called by the cron worker
// on failed re-processing to keep things tidy.
export async function deleteDocChunks(params: {
  userId: string;
  docId: string;
}) {
  const client = getQdrantClient();

  await client.delete(qdrantConfig.collectionName, {
    wait: true,
    filter: {
      must: [
        { key: "user_id", match: { value: params.userId } },
        { key: "doc_id", match: { value: params.docId } },
      ],
    },
  });
}

// Pure semantic search restricted to one user's chunks.
// Optionally narrowed to a set of doc ids (the thread's document
// scope) — empty/undefined `docIds` means search ALL the user's
// chunks. Returns the top-K matches with payload + similarity score.
export async function searchUserChunks(params: {
  userId: string;
  queryEmbedding: number[];
  topK?: number;
  docIds?: string[];
}): Promise<RetrievedChunk[]> {
  const client = getQdrantClient();
  const topK = params.topK ?? qdrantConfig.defaultTopK;

  // user_id is the security boundary; doc_id (any-of) is the
  // optional per-thread scope.
  const must: Record<string, unknown>[] = [
    { key: "user_id", match: { value: params.userId } },
  ];
  if (params.docIds && params.docIds.length > 0) {
    must.push({ key: "doc_id", match: { any: params.docIds } });
  }

  const result = await client.query(qdrantConfig.collectionName, {
    query: params.queryEmbedding,
    limit: topK,
    with_payload: true,
    filter: { must },
  });

  return result.points.map((p) => {
    const payload = p.payload as unknown as ChunkPayload;
    return {
      ...payload,
      score: p.score ?? 0,
    };
  });
}

// All chunks for one doc, ordered by chunk_index. Used by the
// "view chunks" dialog on the Documents page so the user can see
// exactly what was indexed. Scrolls (no vector query) and is
// scoped by user_id + doc_id. Capped defensively.
export async function listDocChunks(params: {
  userId: string;
  docId: string;
}): Promise<ChunkPayload[]> {
  const client = getQdrantClient();
  const out: ChunkPayload[] = [];
  let offset: string | number | undefined = undefined;
  const PAGE = 256;
  const MAX = 5000; // safety cap

  // Scroll through all matching points.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await client.scroll(qdrantConfig.collectionName, {
      with_payload: true,
      with_vector: false,
      limit: PAGE,
      offset,
      filter: {
        must: [
          { key: "user_id", match: { value: params.userId } },
          { key: "doc_id", match: { value: params.docId } },
        ],
      },
    });

    for (const p of res.points) {
      out.push(p.payload as unknown as ChunkPayload);
    }

    const next = res.next_page_offset;
    if (!next || out.length >= MAX) break;
    offset = next as string | number;
  }

  return out.sort((a, b) => a.chunk_index - b.chunk_index);
}
