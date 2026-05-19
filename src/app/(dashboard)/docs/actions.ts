"use server";

// ------------------------------------------------------------
// Server actions for the /docs page.
//
// All mutations live here so the client never talks to internal
// REST routes — actions handle validation, auth, and side effects,
// then call revalidatePath() so the table re-renders with fresh
// server-side data on the next React refresh.
// ------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import {
  insertDoc,
  getDocById,
  getDocByFileName,
  deleteDocRow,
  findExistingDocNames,
} from "@/repositories/docs";
import type { Doc } from "@/types/doc";
import { deleteDocChunks, listDocChunks } from "@/lib/qdrant/search";
import {
  ACCEPTED_MIME_TYPES,
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_SIZE_BYTES,
  resolveFileType,
  extractedTextPath,
} from "@/lib/docs/constants";

const STORAGE_BUCKET = "memory-docs";

// Path to revalidate after mutations. Single constant so we don't
// drift if the route ever moves.
const DOCS_PATH = "/docs";

// Discriminated-union result so the client can pattern-match
// without throwing across the server-action boundary.
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ============================================================
// uploadDocs
// ------------------------------------------------------------
// Accepts the dropzone's FormData. Validates each file
// individually — invalid files are returned in `rejected` while
// valid ones still go through. This matches the standard
// multi-file picker UX (one oversized file shouldn't block the
// other four).
// ============================================================
export interface RejectedFile {
  name: string;
  reason: string;
}

export interface UploadDocsData {
  uploadedCount: number;
  // How many of the uploaded files replaced an existing same-named
  // doc (its old chunks/storage/row were torn down first).
  replacedCount: number;
  rejected: RejectedFile[];
}

// ------------------------------------------------------------
// Shared teardown: remove a doc end-to-end (Qdrant chunks →
// Storage object → DB row). Used by both delete and the
// replace-on-upload path. Vector/Storage failures are logged
// but don't block the row delete — an orphan vector is worse
// than a stuck row.
// ------------------------------------------------------------
async function teardownDoc(doc: Doc, userId: string): Promise<void> {
  try {
    await deleteDocChunks({ userId, docId: doc.id });
  } catch (err) {
    console.error("[teardown] Qdrant cleanup failed", err);
  }

  if (doc.storage_path) {
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([doc.storage_path]);
    if (error) console.error("[teardown] Storage cleanup failed", error);
  }

  await deleteDocRow(doc.id);
}

export async function uploadDocsAction(
  formData: FormData,
): Promise<ActionResult<UploadDocsData>> {
  const user = await requireUser();

  // Filter the FormData payload to actual File instances.
  const allFiles = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File);

  if (allFiles.length === 0) {
    return { ok: false, error: "No files provided" };
  }

  // Cap the batch instead of rejecting it wholesale: keep the first
  // N, record the excess as rejected (mirrors the client and stays
  // correct even if a client bypasses the UI cap).
  const batch = allFiles.slice(0, MAX_FILES_PER_UPLOAD);
  const acceptedMimes = Object.keys(ACCEPTED_MIME_TYPES);
  const accepted: File[] = [];
  const rejected: RejectedFile[] = allFiles
    .slice(MAX_FILES_PER_UPLOAD)
    .map((f) => ({
      name: f.name,
      reason: `Only ${MAX_FILES_PER_UPLOAD} files per upload — skipped`,
    }));

  for (const file of batch) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      rejected.push({
        name: file.name,
        reason: "Exceeds the 10 MB limit",
      });
      continue;
    }
    const fileType = resolveFileType(file);
    if (!fileType || (file.type && !acceptedMimes.includes(file.type))) {
      rejected.push({
        name: file.name,
        reason: "Unsupported file type",
      });
      continue;
    }
    accepted.push(file);
  }

  // If literally nothing is valid, return a single error so the UI
  // can show a concise toast (instead of "uploaded 0").
  if (accepted.length === 0) {
    return {
      ok: false,
      error:
        rejected.length === 1
          ? `${rejected[0]!.name}: ${rejected[0]!.reason}`
          : "All files were rejected",
    };
  }

  const supabase = await createClient();
  let uploadedCount = 0;
  let replacedCount = 0;

  // Process valid files sequentially. Per-file failures during
  // Storage/DB writes are reported via `rejected` rather than
  // aborting the whole batch.
  for (const file of accepted) {
    const fileType = resolveFileType(file)!;
    const ext = file.name.split(".").pop()!.toLowerCase();

    // 0. Replace-on-duplicate: if this user already has a doc with
    //    the same file name, tear the old one down first so we don't
    //    end up with two rows / stale vectors for the same file. The
    //    client warns the user before reaching this point.
    try {
      const existing = await getDocByFileName(file.name);
      if (existing) {
        await teardownDoc(existing, user.id);
        replacedCount += 1;
      }
    } catch (err) {
      console.error("[upload action] replace teardown failed", err);
      rejected.push({
        name: file.name,
        reason: "Failed to replace existing document",
      });
      continue;
    }

    // 1. Reserve a row so we know the doc id before touching Storage.
    let row;
    try {
      row = await insertDoc({
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: fileType,
        storage_path: "",
      });
    } catch (err) {
      console.error("[upload action] insert failed", err);
      rejected.push({
        name: file.name,
        reason: "Failed to record upload",
      });
      continue;
    }

    const storagePath = `${user.id}/${row.id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // 2. Upload to Storage at the canonical path.
    const { error: storageErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || undefined,
        upsert: false,
      });
    if (storageErr) {
      console.error("[upload action] storage failed", storageErr);
      await deleteDocRow(row.id).catch(() => undefined);
      rejected.push({
        name: file.name,
        reason: `Storage error: ${storageErr.message}`,
      });
      continue;
    }

    // 3. Patch the row with the resolved storage_path so the cron
    //    worker can find the object.
    const { error: updErr } = await supabase
      .from("memory_docs")
      .update({ storage_path: storagePath })
      .eq("id", row.id);

    if (updErr) {
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath])
        .catch(() => undefined);
      await deleteDocRow(row.id).catch(() => undefined);
      rejected.push({
        name: file.name,
        reason: "Failed to finalise upload",
      });
      continue;
    }

    uploadedCount += 1;
  }

  // Invalidate the cached /docs RSC so the new pending rows show up.
  revalidatePath(DOCS_PATH);

  return { ok: true, data: { uploadedCount, replacedCount, rejected } };
}

// ============================================================
// deleteDoc
// ------------------------------------------------------------
// Tears a single doc down end-to-end: Qdrant chunks, Storage
// object, then the DB row. Qdrant + Storage failures are logged
// but don't block the row delete — leaving an orphan vector is
// worse than leaving the row alive.
// ============================================================
export async function deleteDocAction(docId: string): Promise<ActionResult> {
  const user = await requireUser();

  const doc = await getDocById(docId);
  if (!doc) {
    return { ok: false, error: "Document not found" };
  }

  try {
    await teardownDoc(doc, user.id);
  } catch (err) {
    console.error("[delete action] DB delete failed", err);
    return { ok: false, error: "Failed to delete document" };
  }

  revalidatePath(DOCS_PATH);
  return { ok: true, data: undefined };
}

// ============================================================
// getDocExtractedText
// ------------------------------------------------------------
// Returns a doc's canonical extracted text (the .extracted.txt
// sidecar written by the processing pipeline). Used by the chat
// preview pane to render the document and highlight cited spans.
//
// Ownership: getDocById is RLS-scoped, so a non-owner gets null.
// The sidecar download uses the same RLS-scoped client (the user
// owns their {user_id}/ Storage folder).
// ============================================================
export async function getDocExtractedText(
  docId: string,
): Promise<ActionResult<{ text: string }>> {
  const user = await requireUser();

  const doc = await getDocById(docId);
  if (!doc) {
    return { ok: false, error: "Document not found" };
  }
  if (doc.status !== "completed") {
    return { ok: false, error: "Document is not processed yet" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(extractedTextPath(user.id, doc.id));

  if (error || !data) {
    console.error("[getDocExtractedText] sidecar download failed", error);
    return {
      ok: false,
      error:
        "Preview text unavailable — re-upload this document to regenerate it.",
    };
  }

  return { ok: true, data: { text: await data.text() } };
}

// ============================================================
// getDocFileUrl
// ------------------------------------------------------------
// Returns a short-lived signed URL to a doc's ORIGINAL file in
// Storage (the uploaded .pdf / .txt itself, not the extracted
// sidecar). The preview pane embeds PDFs via this URL so the
// browser renders the document exactly as-is.
//
// Ownership: getDocById is RLS-scoped, so a non-owner gets null;
// the signed URL is created with the same RLS-scoped client.
// ============================================================
const PREVIEW_URL_TTL_SECONDS = 30 * 60; // 30 min

export async function getDocFileUrl(
  docId: string,
): Promise<ActionResult<{ url: string; fileType: Doc["file_type"] }>> {
  await requireUser();

  const doc = await getDocById(docId);
  if (!doc) {
    return { ok: false, error: "Document not found" };
  }
  if (!doc.storage_path) {
    return { ok: false, error: "Document file is unavailable" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.storage_path, PREVIEW_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[getDocFileUrl] signed URL failed", error);
    return { ok: false, error: "Could not load the document file" };
  }

  return { ok: true, data: { url: data.signedUrl, fileType: doc.file_type } };
}

// ============================================================
// getDocChunks
// ------------------------------------------------------------
// Returns every chunk indexed for a doc (ordered by chunk_index)
// so the user can see exactly what was created for that file.
// Ownership: getDocById is RLS-scoped → non-owner gets null.
// ============================================================
export interface DocChunkView {
  chunk_index: number;
  content: string;
  char_start: number;
  char_end: number;
}

export async function getDocChunks(
  docId: string,
): Promise<ActionResult<{ chunks: DocChunkView[] }>> {
  const user = await requireUser();

  const doc = await getDocById(docId);
  if (!doc) {
    return { ok: false, error: "Document not found" };
  }

  try {
    const chunks = await listDocChunks({ userId: user.id, docId: doc.id });
    return {
      ok: true,
      data: {
        chunks: chunks.map((c) => ({
          chunk_index: c.chunk_index,
          content: c.content,
          char_start: c.char_start,
          char_end: c.char_end,
        })),
      },
    };
  } catch (err) {
    console.error("[getDocChunks] failed", err);
    return { ok: false, error: "Failed to load chunks" };
  }
}

// ============================================================
// checkDuplicateNames
// ------------------------------------------------------------
// On-demand duplicate check used by the upload dialog. Given the
// names the user just dropped (≤5), returns which already exist
// for this user. Targeted indexed query — does NOT enumerate the
// user's documents, so it scales to any doc count.
// ============================================================
export async function checkDuplicateNames(
  names: string[],
): Promise<ActionResult<{ duplicates: string[] }>> {
  await requireUser();
  try {
    const duplicates = await findExistingDocNames(names);
    return { ok: true, data: { duplicates } };
  } catch (err) {
    console.error("[checkDuplicateNames] failed", err);
    // Non-fatal: the upload action re-checks + replaces server-side,
    // so a failed pre-check just means no client-side warning.
    return { ok: true, data: { duplicates: [] } };
  }
}
