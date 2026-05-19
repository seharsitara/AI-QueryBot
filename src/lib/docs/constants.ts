// ------------------------------------------------------------
// Constants shared between the upload UI and the upload API.
// Keeping limits in one file avoids client/server drift.
// ------------------------------------------------------------

import type { DocFileType } from "@/types/doc";

export const MAX_FILES_PER_UPLOAD = 5;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Private Storage bucket holding original uploads + the canonical
// extracted-text sidecar.
export const STORAGE_BUCKET = "memory-docs";

// Sidecar object key for a doc's canonical extracted text. Same
// per-user folder as the original so existing Storage RLS applies.
// This is the exact string chunk offsets reference and the preview
// pane renders.
export function extractedTextPath(userId: string, docId: string): string {
  return `${userId}/${docId}.extracted.txt`;
}

// Map of accepted extensions → canonical file_type values.
// react-dropzone accepts a MIME-style record (see ACCEPTED_MIME_TYPES below).
export const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".docx"] as const;

// Canonical MIME type for .docx (Open XML wordprocessing).
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// MIME types we accept on the server. Keep this in sync with the
// `memory-docs` Storage bucket's allowed_mime_types whitelist
// (see supabase/migrations/010_*).
export const ACCEPTED_MIME_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  [DOCX_MIME]: [".docx"],
};

// Resolve an uploaded file → our internal DocFileType, or null
// if unsupported. Falls back to extension when the browser can't
// determine the MIME type.
export function resolveFileType(file: {
  name: string;
  type: string;
}): DocFileType | null {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (lower.endsWith(".docx") || file.type === DOCX_MIME) return "docx";
  if (lower.endsWith(".txt") || file.type === "text/plain") return "txt";
  return null;
}
