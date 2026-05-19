// ------------------------------------------------------------
// /api/chat · the chat-streaming endpoint.
//
// Flow (per request):
//   1. Auth check.
//   2. Parse body { threadId?, messages }.
//   3. If threadId is null, lazily create a thread using the first
//      user message as its title.
//   4. Rewrite the latest user query against history (gpt-4o-mini).
//   5. Embed the rewritten query and run semantic search in Qdrant,
//      filtered to the caller's user_id.
//   6. Persist the user message row.
//   7. Stream a gpt-4o response back to the client. Along with the
//      text, send two data parts:
//        • data-thread  → tells the client the (possibly new) threadId
//        • data-chunks  → retrieved sources for the chunks panel
//   8. In onFinish: insert the assistant message row + bump the
//      thread's updated_at.
// ------------------------------------------------------------

import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { requireUser } from "@/lib/auth/get-user";
import { embedQuery } from "@/lib/rag/embeddings";
import { searchUserChunks } from "@/lib/qdrant/search";
import { rewriteQuery } from "@/lib/rag/query-rewriter";
import {
  createThread,
  deriveThreadTitle,
  getThreadById,
  touchThread,
} from "@/repositories/threads";
import {
  insertAssistantMessage,
  insertUserMessage,
} from "@/repositories/messages";
import type { RetrievedChunkForUi } from "@/types/message";

// Model used for the actual answer. The query rewriter uses a smaller
// model — that's configured inside src/lib/rag/query-rewriter.ts.
const CHAT_MODEL = "gpt-4o";

// Top-K retrieval. Chunks are 5000 chars; 4 is plenty of context and
// keeps the prompt token budget tight.
const RETRIEVAL_TOP_K = 4;

// Approximate budget for the retrieved context block in the system prompt.
// Keeps us comfortably under the model's input window even with long history.
const MAX_CONTEXT_CHARS = 20_000;

// System prompt template. {{CONTEXT}} is replaced with the retrieved chunks.
// If retrieval returned nothing we still want the model to be honest about it.
const SYSTEM_PROMPT_TEMPLATE = `You are a helpful assistant that answers questions strictly using the user's uploaded documents.

Rules:
1. Ground every answer in the provided context below.
2. If the context doesn't cover the question, say so plainly. Do not make up facts.
3. Be concise. Use Markdown (lists, headings, code blocks) when it improves clarity.
4. Match the language of the user's question.

Context from the user's documents:
---
{{CONTEXT}}
---`;

// Helper: pull plain text out of a UIMessage's parts array.
function getMessageText(message: UIMessage): string {
  if (!message.parts) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(req: Request) {
  // ---- 1. Auth ----
  const user = await requireUser();

  // ---- 2. Parse body ----
  const body = (await req.json()) as {
    threadId?: string | null;
    messages: UIMessage[];
    // Document scope for a brand-new thread. For existing threads the
    // persisted thread.selected_doc_ids is authoritative (changes are
    // saved via updateThreadSelectedDocsAction), so this is ignored.
    selectedDocIds?: string[];
  };
  const incomingMessages = body.messages ?? [];

  const lastUserMessage = [...incomingMessages]
    .reverse()
    .find((m) => m.role === "user");

  if (!lastUserMessage) {
    return new Response("No user message in payload", { status: 400 });
  }
  const lastUserText = getMessageText(lastUserMessage).trim();
  if (!lastUserText) {
    return new Response("Empty user message", { status: 400 });
  }

  // ---- 3. Thread: resume or lazy-create ----
  // `effectiveDocIds` is the thread's document scope. Empty = answer
  // from ALL the user's completed docs (handled by searchUserChunks).
  let threadId = body.threadId ?? null;
  let effectiveDocIds: string[] = [];
  if (threadId) {
    // Verify ownership. RLS would also block writes, but a clean 403
    // beats a silent insert error mid-stream.
    const existing = await getThreadById(threadId);
    if (!existing) {
      return new Response("Thread not found", { status: 404 });
    }
    // Persisted selection is authoritative for an existing thread.
    effectiveDocIds = existing.selected_doc_ids ?? [];
  } else {
    // Brand-new thread: seed its scope from the client's selection.
    effectiveDocIds = body.selectedDocIds ?? [];
    const created = await createThread({
      userId: user.id,
      title: deriveThreadTitle(lastUserText),
      selectedDocIds: effectiveDocIds,
    });
    threadId = created.id;
  }

  // ---- 4. Rewrite query against history ----
  const historyForRewriter = incomingMessages.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: getMessageText(m),
  }));

  const { rewrittenQuery } = await rewriteQuery({
    history: historyForRewriter,
    currentQuery: lastUserText,
  });

  // ---- 5. Retrieve ----
  const queryEmbedding = await embedQuery(rewrittenQuery);
  const retrieved = await searchUserChunks({
    userId: user.id,
    queryEmbedding,
    topK: RETRIEVAL_TOP_K,
    docIds: effectiveDocIds, // [] ⇒ all the user's docs
  });

  // Shape chunks for the UI panel (and for the persisted message parts).
  // char_start/char_end let the preview pane highlight the exact span.
  const chunksForUi: RetrievedChunkForUi[] = retrieved.map((c) => ({
    doc_id: c.doc_id,
    file_name: c.file_name,
    chunk_index: c.chunk_index,
    content: c.content,
    score: c.score,
    char_start: c.char_start,
    char_end: c.char_end,
  }));

  // Build the {{CONTEXT}} block. Joining with '---' makes chunk
  // boundaries explicit; truncating guards against runaway prompts.
  const contextBlock = retrieved.length
    ? retrieved
        .map(
          (c, i) =>
            `[chunk ${i + 1} · ${c.file_name} #${c.chunk_index}]\n${c.content}`,
        )
        .join("\n\n---\n\n")
        .slice(0, MAX_CONTEXT_CHARS)
    : "(no relevant context found)";

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace("{{CONTEXT}}", contextBlock);

  // ---- 6. Persist user message (before streaming) ----
  // We want this row to exist even if the model errors mid-stream.
  await insertUserMessage({
    threadId,
    content: lastUserText,
    parts: lastUserMessage.parts ?? [{ type: "text", text: lastUserText }],
  });

  // ---- 7. Build the streamed response ----
  // Capture threadId in a closure for the inner callbacks.
  const responseThreadId = threadId;

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Tell the client which thread this response belongs to. For
      // freshly-created threads this is how the client learns the new id
      // so it can navigate to /chat/[id] when the stream finishes.
      writer.write({
        type: "data-thread",
        data: { thread_id: responseThreadId },
      });

      // Send retrieved chunks as a data part. The chunks panel reads
      // these out of the assistant message's parts array.
      writer.write({
        type: "data-chunks",
        data: { chunks: chunksForUi, rewritten_query: rewrittenQuery },
      });

      const result = streamText({
        model: openai(CHAT_MODEL),
        system: systemPrompt,
        messages: await convertToModelMessages(incomingMessages),
        temperature: 0.1,
        maxOutputTokens: 2048,
        onFinish: async ({ text, usage }) => {
          // Persist the final assistant message. We replay the same
          // data parts we sent over the wire so re-hydrating a thread
          // shows the chunks panel exactly as it appeared live.
          try {
            await insertAssistantMessage({
              threadId: responseThreadId,
              content: text,
              parts: [
                {
                  type: "data-chunks",
                  data: {
                    chunks: chunksForUi,
                    rewritten_query: rewrittenQuery,
                  },
                },
                { type: "text", text },
              ],
              rewrittenQuery,
              modelUsed: CHAT_MODEL,
              tokensUsed: usage
                ? {
                    prompt_tokens: usage.inputTokens,
                    completion_tokens: usage.outputTokens,
                    total_tokens:
                      (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
                  }
                : null,
            });

            // Float the thread to the top of the sidebar.
            await touchThread(responseThreadId);
          } catch (err) {
            console.error("[/api/chat] onFinish persist failed:", err);
          }
        },
      });

      // sendStart: false → don't open a new assistant message for the
      // text stream. We already opened one above by writing the
      // data-thread / data-chunks parts, and we want all of it
      // (data + text) to land in a SINGLE message bubble.
      writer.merge(result.toUIMessageStream({ sendStart: false }));
    },
    onError: (err) => {
      console.error("[/api/chat] stream error:", err);
      return err instanceof Error ? err.message : "Stream error";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
