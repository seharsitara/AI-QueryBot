import { ChatWindow } from "@/components/chat/chat-window";
import { listCompletedDocsForUser } from "@/repositories/docs";

export default async function MultiChatPage() {
  const completedDocs = await listCompletedDocsForUser();

  return (
    <ChatWindow
      threadId={null}
      completedDocs={completedDocs}
      initialSelectedDocIds={[]}
      variant="multi"
    />
  );
}
