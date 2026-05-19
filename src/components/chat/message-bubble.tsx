"use client";

// ------------------------------------------------------------
// One chat bubble. User messages render plain; assistant
// messages render Markdown and expose a "Sources" link if any
// chunks were retrieved for that turn.
// ------------------------------------------------------------

import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { SourceCards } from "./source-cards";
import type { RetrievedChunkForUi } from "@/types/message";

interface MessageBubbleProps {
  message: UIMessage;
  isStreaming: boolean;
  // Open a retrieved chunk's full text in a modal.
  onShowChunk: (chunk: RetrievedChunkForUi) => void;
}

// Extract joined text content from message parts.
function getText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// Find the retrieved-chunks data part. Server emits this as
// `data-chunks` per the chat route; we preserve the same key when
// persisting messages so resumed threads show the panel too.
function getChunksPart(message: UIMessage): {
  chunks: RetrievedChunkForUi[];
  rewrittenQuery: string;
} | null {
  for (const part of message.parts ?? []) {
    if (part.type === "data-chunks") {
      const data = (part as { data?: { chunks?: RetrievedChunkForUi[]; rewritten_query?: string } }).data;
      if (data?.chunks) {
        return {
          chunks: data.chunks,
          rewrittenQuery: data.rewritten_query ?? "",
        };
      }
    }
  }
  return null;
}

export function MessageBubble({
  message,
  isStreaming,
  onShowChunk,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const text = getText(message);
  const chunks = isUser ? null : getChunksPart(message);

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-foreground text-background"
            : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{text}</p>
        ) : (
          <div className="prose prose-sm prose-neutral max-w-none break-words dark:prose-invert prose-pre:bg-background prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            {isStreaming && text.length > 0 && (
              <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-foreground align-baseline" />
            )}
          </div>
        )}

        {chunks && chunks.chunks.length > 0 && !isStreaming && (
          <SourceCards chunks={chunks.chunks} onOpen={onShowChunk} />
        )}
      </div>
    </div>
  );
}
