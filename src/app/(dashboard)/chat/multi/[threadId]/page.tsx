import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { ChatWindow } from "@/components/chat/chat-window";
import { listCompletedDocsForUser } from "@/repositories/docs";
import { getThreadById } from "@/repositories/threads";
import { listMessagesForThread } from "@/repositories/messages";
import type { ThreadMessage } from "@/types/message";

function toUIMessage(row: ThreadMessage): UIMessage {
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

export default async function MultiThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const thread = await getThreadById(threadId);
  if (!thread) notFound();

  const [history, completedDocs] = await Promise.all([
    listMessagesForThread(threadId),
    listCompletedDocsForUser(),
  ]);

  return (
    <ChatWindow
      threadId={threadId}
      initialMessages={history.map(toUIMessage)}
      completedDocs={completedDocs}
      initialSelectedDocIds={thread.selected_doc_ids ?? []}
      variant="multi"
    />
  );
}
