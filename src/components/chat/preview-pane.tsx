"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { PdfPreview } from "./pdf-preview";
import {
  getDocExtractedText,
  getDocFileUrl,
} from "@/app/(dashboard)/docs/actions";
import type { Doc } from "@/types/doc";

interface PreviewPaneProps {
  docs: Doc[];
  activeDocId: string | null;
  onActiveDocChange: (docId: string) => void;
}

type Resolved =
  | { kind: "pdf"; url: string }
  | { kind: "docx"; url: string }
  | { kind: "txt"; text: string };

const scrollHidden =
  "overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export function PreviewPane({
  docs,
  activeDocId,
  onActiveDocChange,
}: PreviewPaneProps) {
  const cacheRef = useRef<Map<string, Resolved>>(new Map());
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDoc = docs.find((d) => d.id === activeDocId) ?? null;

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
        const res = await getDocFileUrl(activeDocId);
        if (!res.ok) return { error: res.error };
        return { kind: activeDoc.file_type, url: res.data.url };
      }
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
    <div className="flex h-full flex-col border-l border-slate-200 bg-white">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f2d52]">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0f2d52]">
            Document Preview
          </p>
          <p className="truncate text-[10px] text-slate-500">
            {activeDoc?.file_name ?? "Select a document"}
          </p>
        </div>
        <select
          value={activeDocId ?? ""}
          onChange={(e) => onActiveDocChange(e.target.value)}
          disabled={docs.length === 0}
          className="max-w-[180px] truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-[#0f2d52] focus:outline-none focus:ring-2 focus:ring-[#0f2d52]/20"
        >
          {docs.length === 0 ? (
            <option value="">No documents</option>
          ) : (
            <>
              {!activeDocId && <option value="">Select a document</option>}
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.file_name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      <div className="min-h-0 flex-1 bg-slate-50/30">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#0f2d52]" />
            <p className="text-xs text-slate-500">Loading document...</p>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        ) : !activeDoc || !resolved ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <FileText className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-[#0f2d52]">
              No document selected
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Choose a file from the dropdown to preview it here
            </p>
          </div>
        ) : resolved.kind === "pdf" ? (
          <PdfPreview key={activeDoc.id} url={resolved.url} />
        ) : resolved.kind === "docx" ? (
          <div className="relative h-full w-full">
            {docxRendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                <Loader2 className="h-6 w-6 animate-spin text-[#0f2d52]" />
              </div>
            )}
            <div
              key={activeDoc.id}
              ref={docxRef}
              className={`h-full w-full bg-white ${scrollHidden}`}
            />
          </div>
        ) : (
          <div className={`h-full ${scrollHidden}`}>
            <pre className="whitespace-pre-wrap break-words px-5 py-5 font-sans text-[13px] leading-6 text-slate-700">
              {resolved.text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
