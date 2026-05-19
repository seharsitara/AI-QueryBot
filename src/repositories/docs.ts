// ------------------------------------------------------------
// Data-access layer for memory_docs.
//
// Two clients are used depending on the caller:
//   • RLS-scoped (`createClient`)        — request-time API routes
//     where the user identity matters.
//   • Service role (`createSecretClient`) — the cron worker, which
//     needs to read pending rows across all users.
//
// Repository functions ONLY return DB rows / mutate state — no
// business logic lives here. Validation + auth checks belong in
// the route handlers.
// ------------------------------------------------------------

import { createClient, createSecretClient } from "@/lib/supabase/server";
import type { Doc, DocFileType } from "@/types/doc";

const TABLE = "memory_docs";

export interface NewDocRow {
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: DocFileType;
  storage_path: string;
}

// Insert a row representing a freshly-uploaded file in `pending`
// status. The cron worker will pick it up on its next tick.
export async function insertDoc(row: NewDocRow): Promise<Doc> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data as Doc;
}

// Return every doc owned by a user, newest first.
export async function listDocsForUser(): Promise<Doc[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Doc[];
}

export interface DocsPage {
  docs: Doc[];
  total: number; // total matching rows (for pagination)
  page: number; // 1-based
  pageSize: number;
}

// Paginated + name-searchable doc listing for the /docs table.
// `q` does a case-insensitive substring match on file_name.
export async function listDocsPage(params: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<DocsPage> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  const q = params.q?.trim();
  if (q) {
    // Escape PostgREST ilike wildcards in user input.
    const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.ilike("file_name", `%${safe}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    docs: (data ?? []) as Doc[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

// Of the given file names, return the subset the user has ALREADY
// uploaded. Targeted lookup (WHERE user_id=… AND file_name = ANY(names))
// — scales regardless of total doc count, unlike fetching every name.
// `names` is bounded by MAX_FILES_PER_UPLOAD (≤5).
export async function findExistingDocNames(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("file_name")
    .in("file_name", names); // RLS already scopes to the caller

  if (error) throw error;
  // De-dupe (a name could exist on multiple rows after edge cases).
  return Array.from(new Set((data ?? []).map((r) => r.file_name as string)));
}

// Only docs that finished processing — the set a thread can be
// scoped to (pending/failed docs have no chunks to retrieve from).
export async function listCompletedDocsForUser(): Promise<Doc[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Doc[];
}

// Find a user's doc by its (case-sensitive) file name. RLS scopes
// this to the caller, so a match means "this user already uploaded
// a file with this name" — used to detect replace-on-upload.
// Returns the most recent match if somehow more than one exists.
export async function getDocByFileName(fileName: string): Promise<Doc | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("file_name", fileName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as Doc | null) ?? null;
}

// Look up one doc by id (RLS will hide rows the caller doesn't own).
export async function getDocById(id: string): Promise<Doc | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Doc | null) ?? null;
}

// Hard-delete a doc row. Storage object + Qdrant chunks are
// removed by the calling action — see deleteDocAction.
export async function deleteDocRow(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------
// Service-role helpers (cron worker only).
// ------------------------------------------------------------

// Claim up to `limit` pending docs by flipping them to 'processing'.
// Naive grab — pg_cron only fires every 2 min and we run a single
// worker, so we don't need FOR UPDATE SKIP LOCKED.
export async function claimPendingDocs(limit: number): Promise<Doc[]> {
  const admin = createSecretClient();

  // Step 1: pick candidate ids.
  const { data: pending, error: selErr } = await admin
    .from(TABLE)
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (selErr) throw selErr;
  const ids = (pending ?? []).map((r) => r.id);
  if (ids.length === 0) return [];

  // Step 2: flip to processing — only those still pending (defensive
  // against the very unlikely case of a parallel claim).
  const { data: claimed, error: updErr } = await admin
    .from(TABLE)
    .update({ status: "processing" })
    .in("id", ids)
    .eq("status", "pending")
    .select();

  if (updErr) throw updErr;
  return (claimed ?? []) as Doc[];
}

// Mark a doc complete with its final chunk count.
export async function markDocCompleted(id: string, chunksCount: number) {
  const admin = createSecretClient();
  const { error } = await admin
    .from(TABLE)
    .update({
      status: "completed",
      chunks_count: chunksCount,
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", id);
  if (error) throw error;
}

// Mark a doc failed with the error message for the UI to surface.
export async function markDocFailed(id: string, message: string) {
  const admin = createSecretClient();
  const { error } = await admin
    .from(TABLE)
    .update({
      status: "failed",
      error_message: message.slice(0, 1000), // hard cap, just in case
    })
    .eq("id", id);
  if (error) throw error;
}
