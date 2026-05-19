"use client";

// ------------------------------------------------------------
// Document name cell. When the doc is processed, the name is a
// button that opens a dialog listing every chunk indexed for it
// (so the user can see exactly what was created). Otherwise it's
// plain text.
// ------------------------------------------------------------

import { useState } from "react";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  getDocChunks,
  type DocChunkView,
} from "@/app/(dashboard)/docs/actions";

interface DocNameProps {
  docId: string;
  fileName: string;
  status: string;
  chunksCount: number;
}

export function DocName({
  docId,
  fileName,
  status,
  chunksCount,
}: DocNameProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chunks, setChunks] = useState<DocChunkView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clickable = status === "completed" && chunksCount > 0;

  async function openDialog() {
    setOpen(true);
    if (chunks || loading) return; // already loaded / loading
    setLoading(true);
    setError(null);
    const res = await getDocChunks(docId);
    if (res.ok) setChunks(res.data.chunks);
    else setError(res.error);
    setLoading(false);
  }

  if (!clickable) {
    return (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="truncate" title={fileName}>
          {fileName}
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex min-w-0 items-center gap-2 text-left hover:underline"
        title={`View chunks for ${fileName}`}
      >
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{fileName}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="truncate">{fileName}</DialogTitle>
            <DialogDescription className="text-xs">
              {chunks
                ? `${chunks.length} chunk${chunks.length === 1 ? "" : "s"} indexed`
                : "Loading chunks…"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[62vh]">
            <div className="space-y-3 px-6 py-4">
              {loading && (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              {chunks?.map((c) => (
                <div
                  key={c.chunk_index}
                  className="rounded-md border bg-muted/30 p-3"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      #{c.chunk_index}
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      chars {c.char_start}–{c.char_end}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-muted-foreground">
                    {c.content}
                  </pre>
                </div>
              ))}
              {chunks && chunks.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No chunks found for this document.
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
