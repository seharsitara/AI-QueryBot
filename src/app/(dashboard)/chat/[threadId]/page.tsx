// ------------------------------------------------------------
// /chat/[threadId] · resumes a past chat. We load the full
// message history server-side so the client renders instantly
// without an extra round-trip, then hand it to useChat via
// `initialMessages`.
// ------------------------------------------------------------

import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { ChatWindow } from "@/components/chat/chat-window";
import { listCompletedDocsForUser } from "@/repositories/docs";
import { getThreadById } from "@/repositories/threads";
import { listMessagesForThread } from "@/repositories/messages";
import type { ThreadMessage } from "@/types/message";

// Turn a persisted message row into a UIMessage the AI SDK can
// re-hydrate. We use the same `parts` shape we wrote on insert
// so the chunks panel works out of the box on resumed threads.
function toUIMessage(row: ThreadMessage): UIMessage {
  // Fallback if parts wasn't populated for some reason.
  const parts =
    row.parts && row.parts.length > 0
      ? (row.parts as UIMessage["parts"])
      : ([{ type: "text", text: row.content }] as UIMessage["parts"]);

  return {
    id: row.id,
    role: row.role,
    parts,
  };
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  // Ownership is enforced by RLS — `getThreadById` returns null
  // when the row exists but belongs to another user.
  const thread = await getThreadById(threadId);
  if (!thread) notFound();

  const [history, completedDocs] = await Promise.all([
    listMessagesForThread(threadId),
    listCompletedDocsForUser(),
  ]);

  const initialMessages = history.map(toUIMessage);

  return (
    <ChatWindow
      threadId={threadId}
      initialMessages={initialMessages}
      completedDocs={completedDocs}
      initialSelectedDocIds={thread.selected_doc_ids ?? []}
    />
  );
}
