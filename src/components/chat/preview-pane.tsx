"use client";

// ------------------------------------------------------------
// Right-side document preview. Render-only — no citations.
//
// Behaviour by file_type:
//   • pdf → embed the ORIGINAL file in an <iframe> via a
//           short-lived Supabase signed URL, so the browser
//           renders it exactly as the source PDF.
//   • txt → render the canonical extracted text as plain text.
//
// The user picks a doc from the dropdown; it renders here. Per
// doc, the resolved URL/text is fetched once and cached for the
// component's lifetime (signed URLs are valid ~30 min, longer
// than a typical session of flipping between docs).
// ------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getDocExtractedText,
  getDocFileUrl,
} from "@/app/(dashboard)/docs/actions";
import type { Doc } from "@/types/doc";

interface PreviewPaneProps {
  docs: Doc[]; // docs available to preview
  activeDocId: string | null;
  onActiveDocChange: (docId: string) => void;
  onClose: () => void;
}

// Resolved, renderable form of a doc — cached per docId.
type Resolved =
  | { kind: "pdf"; url: string }
  | { kind: "docx"; url: string }
  | { kind: "txt"; text: string };

export function PreviewPane({
  docs,
  activeDocId,
  onActiveDocChange,
  onClose,
}: PreviewPaneProps) {
  const cacheRef = useRef<Map<string, Resolved>>(new Map());
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDoc = docs.find((d) => d.id === activeDocId) ?? null;

  // Load (or read from cache) the active doc's renderable form.
  useEffect(() => {
    let cancelled = false;

    if (!activeDocId || !activeDoc) {
      setResolved(null);
      setError(null);
      return;
    }

    const cached = cacheRef.current.get(activeDocId);
    if (cached) {
      setResolved(cached);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const load = async (): Promise<Resolved | { error: string }> => {
      if (activeDoc.file_type === "pdf" || activeDoc.file_type === "docx") {
        // Both render from the original file via a signed URL: pdf
        // in a native <iframe>, docx through docx-preview.
        const res = await getDocFileUrl(activeDocId);
        if (!res.ok) return { error: res.error };
        return { kind: activeDoc.file_type, url: res.data.url };
      }
      // txt → canonical extracted text
      const res = await getDocExtractedText(activeDocId);
      return res.ok
        ? { kind: "txt", text: res.data.text }
        : { error: res.error };
    };

    load()
      .then((out) => {
        if (cancelled) return;
        if ("error" in out) {
          setError(out.error);
          setResolved(null);
        } else {
          cacheRef.current.set(activeDocId, out);
          setResolved(out);
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [activeDocId, activeDoc]);

  // docx → render via docx-preview into a container node. Separate
  // effect: it needs the resolved signed URL AND a mounted DOM node,
  // and docx-preview is browser-only so it's imported lazily.
  const docxRef = useRef<HTMLDivElement>(null);
  const [docxRendering, setDocxRendering] = useState(false);

  useEffect(() => {
    if (!resolved || resolved.kind !== "docx") return;
    const container = docxRef.current;
    if (!container) return;

    let cancelled = false;
    setDocxRendering(true);
    setError(null);

    (async () => {
      try {
        const [{ renderAsync }, res] = await Promise.all([
          import("docx-preview"),
          fetch(resolved.url),
        ]);
        if (!res.ok) throw new Error(`download failed (${res.status})`);
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        container.innerHTML = "";
        await renderAsync(buffer, container, undefined, {
          inWrapper: true,
          ignoreLastRenderedPageBreak: true,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[preview] docx render failed", err);
        setError("Could not render this .docx file.");
      } finally {
        if (!cancelled) setDocxRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolved]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header: doc switcher + close */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <span className="text-xs font-medium text-muted-foreground">
          Preview
        </span>
        <select
          value={activeDocId ?? ""}
          onChange={(e) => onActiveDocChange(e.target.value)}
          disabled={docs.length === 0}
          className="min-w-0 flex-1 truncate rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
        >
          {docs.length === 0 ? (
            <option value="">No documents</option>
          ) : (
            <>
              {!activeDocId && <option value="">Select a document…</option>}
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.file_name}
                </option>
              ))}
            </>
          )}
        </select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 shrink-0"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        ) : !activeDoc || !resolved ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-xs text-muted-foreground">
              Select a document to preview it here.
            </p>
          </div>
        ) : resolved.kind === "pdf" ? (
          <iframe
            key={activeDoc.id}
            src={resolved.url}
            title={activeDoc.file_name}
            className="h-full w-full border-0"
          />
        ) : resolved.kind === "docx" ? (
          <div className="relative h-full w-full">
            {docxRendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {/* docx-preview renders its own Word-like wrapper
                (gray canvas, white pages, shadows) into this node. */}
            <div
              key={activeDoc.id}
              ref={docxRef}
              className="h-full w-full overflow-auto"
            />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <pre className="whitespace-pre-wrap break-words px-4 py-4 font-sans text-[13px] leading-6 text-foreground">
              {resolved.text}
            </pre>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
