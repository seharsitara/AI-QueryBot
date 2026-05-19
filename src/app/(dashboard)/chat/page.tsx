// ------------------------------------------------------------
// /chat · landing for a brand-new chat. No thread row exists yet
// — one is created lazily by /api/chat once the user sends their
// first message (with the chosen document scope). The server
// writes the new thread id back over the stream and the client
// navigates to /chat/[id].
// ------------------------------------------------------------

import { ChatWindow } from "@/components/chat/chat-window";
import { listCompletedDocsForUser } from "@/repositories/docs";

export default async function NewChatPage() {
  const completedDocs = await listCompletedDocsForUser();

  return (
    <ChatWindow
      threadId={null}
      completedDocs={completedDocs}
      initialSelectedDocIds={[]}
    />
  );
}
