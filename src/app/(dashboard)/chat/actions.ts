"use server";

// ------------------------------------------------------------
// Server actions for chat / thread management.
//
// Kept colocated under (dashboard)/chat so the components that
// invoke them sit next door.
// ------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/get-user";
import {
  deleteThread,
  getThreadById,
  updateThreadSelectedDocs,
  setThreadBookmark,
} from "@/repositories/threads";

// Delete a thread (and its messages, via FK cascade).
// If the user was viewing the deleted thread, send them back to /chat.
export async function deleteThreadAction(params: {
  threadId: string;
  redirectAway?: boolean;
}) {
  await requireUser();

  // Ownership: RLS would also block the delete, but a clean 404
  // beats a silent no-op.
  const existing = await getThreadById(params.threadId);
  if (!existing) {
    return { ok: false, error: "Thread not found" } as const;
  }

  await deleteThread(params.threadId);

  // Refresh the dashboard layout so the sidebar drops the row.
  revalidatePath("/", "layout");

  if (params.redirectAway) {
    redirect("/chat");
  }

  return { ok: true } as const;
}

// Replace a thread's document scope. Called by the doc selector
// whenever the user ticks/unticks docs on an EXISTING thread.
// Empty array = answer from all completed docs. (For a not-yet-
// created thread the selection rides along with the first
// /api/chat request instead.)
export async function updateThreadSelectedDocsAction(params: {
  threadId: string;
  docIds: string[];
}) {
  await requireUser();

  const existing = await getThreadById(params.threadId);
  if (!existing) {
    return { ok: false, error: "Thread not found" } as const;
  }

  await updateThreadSelectedDocs(params.threadId, params.docIds);
  return { ok: true } as const;
}

// Pin / unpin a thread for the sidebar Bookmarked section.
export async function toggleThreadBookmarkAction(params: {
  threadId: string;
  bookmarked: boolean;
}) {
  await requireUser();

  const existing = await getThreadById(params.threadId);
  if (!existing) {
    return { ok: false, error: "Thread not found" } as const;
  }

  await setThreadBookmark(params.threadId, params.bookmarked);
  // Refresh the dashboard layout so the sidebar re-sections.
  revalidatePath("/", "layout");
  return { ok: true } as const;
}
