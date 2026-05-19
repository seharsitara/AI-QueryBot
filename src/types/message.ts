// ------------------------------------------------------------
// Domain types for chat messages.
// Mirrors the `assistant_thread_messages` table.
//
// `parts` follows the Vercel AI SDK v6 UIMessage parts shape so we
// can re-hydrate a thread by passing rows straight into useChat's
// `initialMessages`. We deliberately keep the type loose (`unknown[]`)
// here because the SDK's `UIMessagePart` is generic and we don't want
// to leak that into our DB layer.
// ------------------------------------------------------------

export type MessageRole = "user" | "assistant";

export interface ThreadMessage {
  id: string;
  thread_id: string;
  role: MessageRole;
  content: string;
  parts: unknown[];
  rewritten_query: string | null;
  model_used: string | null;
  tokens_used: TokenUsage | null;
  created_at: string;
}

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

// Shape stored inside the assistant message `parts` array to surface
// retrieved chunks in the UI (the chunks panel). Sent over the stream
// as a `data-chunks` part and also persisted alongside the message.
export interface ChunksDataPart {
  type: "data-chunks";
  data: {
    chunks: RetrievedChunkForUi[];
    rewritten_query: string;
  };
}

export interface RetrievedChunkForUi {
  doc_id: string;
  file_name: string;
  chunk_index: number;
  content: string;
  score: number;
  // Offsets into the doc's canonical extracted text — lets the
  // preview pane highlight the exact cited span when a source
  // card is clicked. Persisted in the message parts so resumed
  // threads keep precise citations.
  char_start: number;
  char_end: number;
}
