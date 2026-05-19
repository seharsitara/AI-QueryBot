// ------------------------------------------------------------
// Domain types for uploaded documents.
// Shape mirrors the memory_docs table — every column has a
// representation here so we can pass DB rows straight to the UI.
// ------------------------------------------------------------

export type DocStatus = "pending" | "processing" | "completed" | "failed";
export type DocFileType = "pdf" | "txt" | "docx";

// Single doc row as the UI sees it.
export interface Doc {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: DocFileType;
  storage_path: string;
  status: DocStatus;
  error_message: string | null;
  chunks_count: number;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Per-chunk payload we store on Qdrant points. Keeping this typed
// in one place avoids drift between the writer (processing pipeline)
// and the reader (chat retrieval).
export interface ChunkPayload {
  user_id: string;
  doc_id: string;
  file_name: string;
  chunk_index: number;
  content: string;
  // Offsets into the canonical extracted text (the .extracted.txt
  // sidecar). Used by the preview pane to highlight the exact
  // cited span.
  char_start: number;
  char_end: number;
}
