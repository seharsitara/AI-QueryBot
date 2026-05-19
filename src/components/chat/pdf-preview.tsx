"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { Loader2 } from "lucide-react";

interface PdfPreviewProps {
  url: string;
}

const PADDING = 16;
const MIN_WIDTH = 200;

async function renderPageToCanvas(
  page: PDFPageProxy,
  cssWidth: number,
): Promise<HTMLCanvasElement> {
  const outputScale = window.devicePixelRatio || 1;
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = cssWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const cssW = Math.floor(viewport.width);
  const cssH = Math.floor(viewport.height);

  canvas.width = Math.floor(cssW * outputScale);
  canvas.height = Math.floor(cssH * outputScale);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.className = "block max-w-full";

  const transform: number[] | undefined =
    outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, 0]
      : undefined;

  await page.render({
    canvasContext: ctx,
    viewport,
    transform,
    canvas,
  }).promise;

  return canvas;
}

async function renderPdfIntoContainer(
  container: HTMLDivElement,
  url: string,
  signal: { cancelled: boolean },
): Promise<void> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
  if (signal.cancelled) return;

  const pdf: PDFDocumentProxy = await pdfjs.getDocument({
    data: await res.arrayBuffer(),
  }).promise;
  if (signal.cancelled) return;

  const cssWidth = Math.max(container.clientWidth - PADDING * 2, MIN_WIDTH);
  container.innerHTML = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    if (signal.cancelled) return;

    const page = await pdf.getPage(pageNum);
    const canvas = await renderPageToCanvas(page, cssWidth);

    const wrap = document.createElement("div");
    wrap.className =
      "mb-4 flex justify-center overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-slate-200/80 last:mb-0";
    wrap.appendChild(canvas);
    container.appendChild(wrap);
  }
}

export function PdfPreview({ url }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastWidthRef = useRef(0);
  const renderGenRef = useRef(0);
  const activeSignalRef = useRef<{ cancelled: boolean } | null>(null);

  const runRender = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    if (width < MIN_WIDTH) return;

    const widthDelta = Math.abs(width - lastWidthRef.current);
    if (lastWidthRef.current > 0 && widthDelta < 8) return;

    lastWidthRef.current = width;
    const gen = ++renderGenRef.current;

    if (activeSignalRef.current) {
      activeSignalRef.current.cancelled = true;
    }
    const signal = { cancelled: false };
    activeSignalRef.current = signal;

    setLoading(true);
    setError(null);

    try {
      await renderPdfIntoContainer(container, url, signal);
    } catch (err) {
      console.error("[pdf-preview] render failed", err);
      if (!signal.cancelled && renderGenRef.current === gen) {
        setError("Could not load PDF preview.");
      }
    } finally {
      if (activeSignalRef.current === signal) {
        activeSignalRef.current = null;
      }
      if (!signal.cancelled && renderGenRef.current === gen) {
        setLoading(false);
      }
    }
  }, [url]);

  useEffect(() => {
    lastWidthRef.current = 0;
    renderGenRef.current += 1;

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let debounceId: ReturnType<typeof setTimeout> | undefined;

    const scheduleRender = () => {
      if (cancelled) return;
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        if (!cancelled) void runRender();
      }, 120);
    };

    scheduleRender();

    const observer = new ResizeObserver(() => {
      scheduleRender();
    });
    observer.observe(container);

    return () => {
      cancelled = true;
      clearTimeout(debounceId);
      observer.disconnect();
      renderGenRef.current += 1;
    };
  }, [url, runRender]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-50/90">
          <Loader2 className="h-6 w-6 animate-spin text-[#0f2d52]" />
          <p className="text-xs text-slate-500">Rendering PDF...</p>
        </div>
      )}
      {error && (
        <div className="flex h-full items-center justify-center px-6 text-center">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overflow-x-hidden px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      />
    </div>
  );
}
