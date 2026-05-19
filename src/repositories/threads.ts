// ------------------------------------------------------------
// Data-access layer for assistant_threads.
//
// All reads/writes go through the RLS-scoped client — a user can
// only see/touch their own threads. The cron worker never touches
// threads, so there's no service-role path here.
// ------------------------------------------------------------

import { createClient } from "@/lib/supabase/server";
import type { Thread } from "@/types/thread";

const TABLE = "assistant_threads";

// Cap thread titles to a sane length. Long pasted prompts shouldn't
// blow up the sidebar.
const MAX_TITLE_LENGTH = 60;

// Trim a raw message down into something fit for the sidebar.
export function deriveThreadTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.replace(/\s+/g, " ").trim();
  if (cleaned.length === 0) return "New chat";
  if (cleaned.length <= MAX_TITLE_LENGTH) return cleaned;
  return cleaned.slice(0, MAX_TITLE_LENGTH - 1).trimEnd() + "…";
}

// List a user's threads ordered by most recent activity.
// Used by the sidebar.
export async function listThreadsForUser(): Promise<Thread[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Thread[];
}

// Look up one thread (RLS hides rows the caller doesn't own).
export async function getThreadById(id: string): Promise<Thread | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Thread | null) ?? null;
}

// Create a new thread. `user_id` is filled in from the caller's session
// via the RLS default — we still pass it explicitly to be safe.
// `selectedDocIds` seeds the thread's document scope (empty = all).
export async function createThread(params: {
  userId: string;
  title: string;
  selectedDocIds?: string[];
}): Promise<Thread> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: params.userId,
      title: params.title,
      selected_doc_ids: params.selectedDocIds ?? [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as Thread;
}

// Replace the thread's document scope. Empty array = answer from all.
// Ownership is enforced by RLS (the update is a no-op for non-owners).
export async function updateThreadSelectedDocs(
  threadId: string,
  docIds: string[],
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ selected_doc_ids: docIds })
    .eq("id", threadId);

  if (error) throw error;
}

// Bump updated_at so the thread floats to the top of the sidebar list.
// Called after every assistant reply lands.
export async function touchThread(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

// Pin / unpin a thread (sidebar Bookmarked section).
export async function setThreadBookmark(
  id: string,
  bookmarked: boolean,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ is_bookmarked: bookmarked })
    .eq("id", id);

  if (error) throw error;
}

// Hard-delete a thread. Messages cascade via FK ON DELETE CASCADE.
export async function deleteThread(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
