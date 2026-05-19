// ------------------------------------------------------------
// Domain type for an assistant chat thread.
// Mirrors the `assistant_threads` table.
// ------------------------------------------------------------

export interface Thread {
  id: string;
  user_id: string;
  title: string;
  // memory_docs ids this thread is scoped to. Empty = answer from
  // ALL of the user's completed documents (the default).
  selected_doc_ids: string[];
  // Pinned by the user — surfaced in the sidebar's Bookmarked section.
  is_bookmarked: boolean;
  created_at: string;
  updated_at: string;
}
