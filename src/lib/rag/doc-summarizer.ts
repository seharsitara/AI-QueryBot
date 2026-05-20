// ------------------------------------------------------------
// Document summarization (standalone from ingestion/chat RAG).
//
// Retrieves high-value chunks for one doc via semantic search,
// then asks gpt-4o-mini for a structured summary. Falls back to
// extracted text when no chunks are indexed.
// ------------------------------------------------------------

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { embedQuery } from "./embeddings";
import { searchUserChunks } from "@/lib/qdrant/search";

const SUMMARY_MODEL = "gpt-4o-mini";
const SUMMARY_QUERY =
  "document summary main topics key findings conclusions important details";
const TOP_K = 8;
const MAX_FALLBACK_CHARS = 12_000;

const SYSTEM_PROMPT = `You are a professional document summarizer. Given excerpts from a document, write a clear, well-structured summary.

Rules:
1. Cover the main topic, purpose, and key points.
2. Use short markdown headings (##) for sections when helpful.
3. Be concise but complete — avoid filler.
4. Do not invent facts not supported by the excerpts.
5. If the content is too sparse to summarize meaningfully, say so briefly.`;

export async function summarizeDocument(params: {
  userId: string;
  docId: string;
  fileName: string;
  fallbackText?: string;
}): Promise<string> {
  const queryEmbedding = await embedQuery(SUMMARY_QUERY);
  const chunks = await searchUserChunks({
    userId: params.userId,
    queryEmbedding,
    topK: TOP_K,
    docIds: [params.docId],
  });

  let context: string;
  if (chunks.length > 0) {
    context = chunks
      .sort((a, b) => a.chunk_index - b.chunk_index)
      .map((c, i) => `--- Excerpt ${i + 1} ---\n${c.content}`)
      .join("\n\n");
  } else if (params.fallbackText?.trim()) {
    context = params.fallbackText.trim().slice(0, MAX_FALLBACK_CHARS);
  } else {
    throw new Error("No text available to summarize.");
  }

  const { text } = await generateText({
    model: openai(SUMMARY_MODEL),
    temperature: 0.3,
    maxOutputTokens: 1500,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Document: "${params.fileName}"\n\nContent:\n${context}\n\nWrite a clear summary:`,
      },
    ],
  });

  const summary = text.trim();
  if (!summary) {
    throw new Error("Summary generation produced no output.");
  }
  return summary;
}
