// ------------------------------------------------------------
// Conversational query rewriter.
//
// Why: a follow-up like "what about the second one?" can't be
// embedded on its own — Qdrant has no idea what "the second one"
// refers to. We use a small, cheap model to rewrite the latest
// user message into a self-contained query that includes any
// implied entities from the conversation history.
//
// Model: gpt-4o-mini (fast + cheap). temperature 0 for determinism.
// ------------------------------------------------------------

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const REWRITER_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a query rewriter for a conversational RAG system. Given the chat history and the latest user question, reformulate the question into a standalone query that can be understood without any prior context.

Rules:
1. If the question is already standalone and self-contained, return it EXACTLY as-is.
2. If the question references previous context (pronouns like "it", "they", "their", "that", "this", or implicit references like "the price", "the time", "how long"), incorporate the relevant entities from the chat history.
3. Preserve the user's original intent, tone, and language.
4. Do NOT answer the question — only reformulate it.
5. Do NOT add information that wasn't implied by the conversation.
6. Keep the rewritten query concise and focused.`;

export interface RewriterMessage {
  role: "user" | "assistant";
  content: string;
}

export interface QueryRewriteResult {
  rewrittenQuery: string;
  wasRewritten: boolean;
}

// Rewrite the most-recent user message into a standalone query.
// On any failure we fall back to the original query so retrieval
// still happens — better degraded than dead.
export async function rewriteQuery(params: {
  history: RewriterMessage[];
  currentQuery: string;
}): Promise<QueryRewriteResult> {
  // First message in a thread — nothing to rewrite against.
  if (params.history.length <= 1) {
    return { rewrittenQuery: params.currentQuery, wasRewritten: false };
  }

  // Build a plain-text history string. Excludes the current query,
  // which we send separately for clarity.
  const historyText = params.history
    .slice(0, -1)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  try {
    const { text } = await generateText({
      model: openai(REWRITER_MODEL),
      temperature: 0,
      maxOutputTokens: 256,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Chat History:\n${historyText}\n\nLatest Question: ${params.currentQuery}\n\nStandalone Question:`,
        },
      ],
    });

    const rewrittenQuery = text.trim();
    const wasRewritten =
      rewrittenQuery.toLowerCase() !== params.currentQuery.toLowerCase();

    return { rewrittenQuery, wasRewritten };
  } catch (err) {
    console.error("[query-rewriter] failed, using original:", err);
    return { rewrittenQuery: params.currentQuery, wasRewritten: false };
  }
}
