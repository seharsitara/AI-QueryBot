"use client";

// ------------------------------------------------------------
// Collapsible source list shown under an assistant message.
// Collapsed by default — the header toggles it. Each card opens
// that chunk's full retrieved text in a modal.
// ------------------------------------------------------------

import { useState } from "react";
import { FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RetrievedChunkForUi } from "@/types/message";

interface SourceCardsProps {
  chunks: RetrievedChunkForUi[];
  onOpen: (chunk: RetrievedChunkForUi) => void;
}

export function SourceCards({ chunks, onOpen }: SourceCardsProps) {
  // Accordion: collapsed by default.
  const [open, setOpen] = useState(false);

  if (chunks.length === 0) return null;

  return (
    <div className="mt-3 border-t border-foreground/10 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 text-[11px] font-medium text-foreground/60 hover:text-foreground"
        aria-expanded={open}
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-90",
          )}
        />
        <FileText className="h-3 w-3" />
        {chunks.length} source{chunks.length === 1 ? "" : "s"}
        <span className="text-foreground/40">
          · {open ? "hide" : "click to view"}
        </span>
      </button>

      {open && (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {chunks.map((c, i) => (
            <button
              key={`${c.doc_id}-${c.chunk_index}-${i}`}
              type="button"
              onClick={() => onOpen(c)}
              className="group flex items-center justify-between gap-2 rounded-md border bg-background/60 px-2.5 py-1.5 text-left transition-colors hover:border-foreground/40 hover:bg-background"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground text-[9px] font-medium text-background">
                  {i + 1}
                </span>
                <span className="truncate text-[11px] font-medium">
                  {c.file_name}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                #{c.chunk_index} · {(c.score * 100).toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
