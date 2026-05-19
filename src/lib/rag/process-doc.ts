// ------------------------------------------------------------
// Orchestrator that turns one queued memory_docs row into
// embedded chunks living in Qdrant.
//
// Steps:
//   1. Download the original file from Supabase Storage
//   2. Decode to plain text (parser depends on file_type)
//   3. Split into fixed-size chunks
//   4. Embed each chunk in batches
//   5. Upsert into Qdrant with {user_id, doc_id, ...} payload
//
// All errors bubble up — the caller is responsible for marking
// the row 'failed' and recording the message.
// ------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { createSecretClient } from "@/lib/supabase/server";
import { chunkText, toCanonicalText } from "./chunker";
import { parsePdf } from "./pdf-parser";
import { parseDocx } from "./docx-parser";
import { embedDocuments } from "./embeddings";
import { upsertDocChunks } from "@/lib/qdrant/search";
import { STORAGE_BUCKET, extractedTextPath } from "@/lib/docs/constants";
import type { ChunkPayload, Doc } from "@/types/doc";

// Pulls the raw file from Storage. Uses the service-role client
// because the cron worker runs without a user session.
async function downloadFile(storagePath: string): Promise<Uint8Array> {
  const supabase = createSecretClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Storage download failed: ${error?.message ?? "no data"}`);
  }

  const buffer = await data.arrayBuffer();
  return new Uint8Array(buffer);
}

// Decode bytes → plain text based on the doc's file_type.
async function extractText(doc: Doc, bytes: Uint8Array): Promise<string> {
  if (doc.file_type === "pdf") {
    return parsePdf(bytes);
  }
  if (doc.file_type === "docx") {
    return parseDocx(bytes);
  }
  // .txt is already text — just decode as UTF-8.
  return new TextDecoder("utf-8").decode(bytes);
}

export interface ProcessDocResult {
  chunksCount: number;
}

// Main entry point. Returns the number of chunks produced so the
// caller can persist it onto the memory_docs row.
export async function processDoc(doc: Doc): Promise<ProcessDocResult> {
  // 1. Download
  const bytes = await downloadFile(doc.storage_path);

  // 2. Parse → canonical text (the single source of truth that
  //    chunk offsets reference and the preview pane renders).
  const rawText = await extractText(doc, bytes);
  const canonical = toCanonicalText(rawText);
  if (canonical.length === 0) {
    throw new Error("Parsed document is empty");
  }

  // 3. Persist the canonical text as a Storage sidecar. upsert:true
  //    so re-uploads (replace-on-duplicate) overwrite cleanly.
  const supabase = createSecretClient();
  const { error: sidecarErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(
      extractedTextPath(doc.user_id, doc.id),
      // Upload as a UTF-8 Buffer — most reliable body type in the
      // Node serverless runtime (Blob construction has been flaky).
      Buffer.from(canonical, "utf-8"),
      // Bare "text/plain" (NO charset param): the bucket's
      // allowed_mime_types whitelist matches the full content-type
      // string, and "text/plain; charset=utf-8" is not in it.
      { upsert: true, contentType: "text/plain" },
    );
  if (sidecarErr) {
    throw new Error(`Sidecar upload failed: ${sidecarErr.message}`);
  }

  // 4. Chunk (offset-aware, relative to `canonical`).
  const chunks = chunkText(canonical);
  if (chunks.length === 0) {
    throw new Error("Chunker produced no output");
  }

  // 5. Embed
  const embeddings = await embedDocuments(chunks.map((c) => c.content));

  // 6. Upsert into Qdrant with offsets in the payload.
  const pointIds = chunks.map(() => randomUUID());
  const payloads: ChunkPayload[] = chunks.map((chunk, idx) => ({
    user_id: doc.user_id,
    doc_id: doc.id,
    file_name: doc.file_name,
    chunk_index: idx,
    content: chunk.content,
    char_start: chunk.start,
    char_end: chunk.end,
  }));

  await upsertDocChunks({ pointIds, embeddings, payloads });

  return { chunksCount: chunks.length };
}
