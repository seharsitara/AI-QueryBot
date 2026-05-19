// ------------------------------------------------------------
// Data-access layer for assistant_thread_messages.
// Messages are append-only — there are no update/delete helpers.
// ------------------------------------------------------------

import { createClient } from "@/lib/supabase/server";
import type {
  MessageRole,
  ThreadMessage,
  TokenUsage,
} from "@/types/message";

const TABLE = "assistant_thread_messages";

// Full ordered history for a thread, oldest first. Used to hydrate
// `useChat`'s initialMessages when a user re-opens a past thread.
export async function listMessagesForThread(
  threadId: string,
): Promise<ThreadMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ThreadMessage[];
}

// Append a user message row. Called from /api/chat just before we
// run retrieval, so it's persisted even if the model errors out.
export async function insertUserMessage(params: {
  threadId: string;
  content: string;
  parts: unknown[];
}): Promise<ThreadMessage> {
  return insertMessage({
    threadId: params.threadId,
    role: "user",
    content: params.content,
    parts: params.parts,
  });
}

// Append an assistant message row. Called from the streamText
// `onFinish` callback once the full response has been collected.
export async function insertAssistantMessage(params: {
  threadId: string;
  content: string;
  parts: unknown[];
  rewrittenQuery: string | null;
  modelUsed: string;
  tokensUsed: TokenUsage | null;
}): Promise<ThreadMessage> {
  return insertMessage({
    threadId: params.threadId,
    role: "assistant",
    content: params.content,
    parts: params.parts,
    rewrittenQuery: params.rewrittenQuery,
    modelUsed: params.modelUsed,
    tokensUsed: params.tokensUsed,
  });
}

// Shared insert path — keeps the column list in one place.
async function insertMessage(params: {
  threadId: string;
  role: MessageRole;
  content: string;
  parts: unknown[];
  rewrittenQuery?: string | null;
  modelUsed?: string | null;
  tokensUsed?: TokenUsage | null;
}): Promise<ThreadMessage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      thread_id: params.threadId,
      role: params.role,
      content: params.content,
      parts: params.parts,
      rewritten_query: params.rewrittenQuery ?? null,
      model_used: params.modelUsed ?? null,
      tokens_used: params.tokensUsed ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ThreadMessage;
}
