"use client";

// ------------------------------------------------------------
// Modal showing the exact text of a single retrieved chunk.
//
// Replaces the old "click a source → highlight it in the preview
// pane" flow. The preview pane is now render-only; retrieved
// chunks are inspected here instead. The chunk's `content` is
// already on RetrievedChunkForUi (sent over the stream and
// persisted), so no extra fetch is needed.
// ------------------------------------------------------------

import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RetrievedChunkForUi } from "@/types/message";

interface ChunkModalProps {
  // The chunk to display, or null when the modal is closed.
  chunk: RetrievedChunkForUi | null;
  onClose: () => void;
}

export function ChunkModal({ chunk, onClose }: ChunkModalProps) {
  return (
    <Dialog open={chunk !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl gap-3">
        {chunk && (
          <>
            <DialogHeader>
              <DialogTitle className="flex min-w-0 items-center gap-2 pr-6 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{chunk.file_name}</span>
              </DialogTitle>
              <p className="text-left font-mono text-[11px] text-muted-foreground">
                chunk #{chunk.chunk_index} · {(chunk.score * 100).toFixed(0)}%
                match
              </p>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] rounded-md border bg-muted/30 [&>[data-radix-scroll-area-viewport]>div]:!block">
              <p className="whitespace-pre-wrap break-words px-4 py-3 text-[13px] leading-6 text-foreground">
                {chunk.content}
              </p>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
