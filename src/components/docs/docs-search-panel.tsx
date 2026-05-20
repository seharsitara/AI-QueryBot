"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileText, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./status-badge";
import { searchDocsSuggestionsAction } from "@/app/(dashboard)/docs/actions";
import { highlightMatch } from "@/lib/utils/highlight-match";
import { formatBytes } from "@/lib/utils/format";
import type { Doc } from "@/types/doc";

export function DocsSearchPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(activeQ);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Doc[]>([]);
  const [total, setTotal] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceUrl = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceFetch = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    setValue(activeQ);
  }, [activeQ]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const pushQuery = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = next.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      params.delete("page");
      params.delete("status");

      startTransition(() => {
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams],
  );

  const fetchSuggestions = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSuggestions([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);

    const res = await searchDocsSuggestionsAction(trimmed);
    if (id !== requestId.current) return;

    if (res.ok) {
      setSuggestions(res.data.docs);
      setTotal(res.data.total);
    } else {
      setSuggestions([]);
      setTotal(0);
    }
    setLoading(false);
  }, []);

  function onQueryChange(next: string) {
    setValue(next);
    setOpen(true);

    if (debounceFetch.current) clearTimeout(debounceFetch.current);
    debounceFetch.current = setTimeout(() => fetchSuggestions(next), 200);

    if (debounceUrl.current) clearTimeout(debounceUrl.current);
    debounceUrl.current = setTimeout(() => pushQuery(next), 400);
  }

  function applySearch(next: string, scrollToDocId?: string) {
    setValue(next);
    if (debounceUrl.current) clearTimeout(debounceUrl.current);
    if (debounceFetch.current) clearTimeout(debounceFetch.current);
    pushQuery(next);
    setOpen(false);

    if (scrollToDocId) {
      requestAnimationFrame(() => {
        document
          .getElementById(`doc-row-${scrollToDocId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  function clearQuery() {
    setValue("");
    setSuggestions([]);
    setTotal(0);
    setOpen(false);
    if (debounceUrl.current) clearTimeout(debounceUrl.current);
    if (debounceFetch.current) clearTimeout(debounceFetch.current);
    pushQuery("");
  }

  const showDropdown = open && value.trim().length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30 px-5 py-4 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2d52]">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#0f2d52]">
              Search documents
            </h2>
            <p className="text-xs text-slate-500">
              Type to see matching files — select one or view all in the table
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 relative" ref={containerRef}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={value}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => {
              setOpen(true);
              if (value.trim()) fetchSuggestions(value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search by file name…"
            className="h-11 border-slate-200 bg-slate-50/50 pl-10 pr-20 text-sm text-[#0f2d52] shadow-none placeholder:text-slate-400 focus-visible:ring-[#0f2d52]/20"
            aria-label="Search documents by file name"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            role="combobox"
          />
          <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1">
            {(loading || isPending) && (
              <Loader2
                className="h-4 w-4 animate-spin text-slate-400"
                aria-hidden
              />
            )}
            {value && (
              <button
                type="button"
                onClick={clearQuery}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0f2d52]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showDropdown && (
            <div
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-slate-200 bg-white shadow-lg max-h-80 overflow-y-auto flex flex-col"
              role="listbox"
            >
              {loading && suggestions.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              ) : suggestions.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-[#0f2d52]">
                    No documents found
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    No files match &ldquo;{value.trim()}&rdquo;
                  </p>
                </div>
              ) : (
                <>
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Results
                    </p>
                    <p className="text-sm font-semibold text-[#0f2d52]">
                      {suggestions.length} found
                    </p>
                  </div>
                  <ul className="overflow-y-auto p-2 flex-1">
                    {suggestions.map((doc) => (
                      <li key={doc.id}>
                        <button
                          type="button"
                          role="option"
                          onClick={() =>
                            applySearch(doc.file_name, doc.id)
                          }
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-slate-50"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f2d52]/10">
                            <FileText className="h-5 w-5 text-[#0f2d52]" />
                          </div>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-[#0f2d52]">
                              {highlightMatch(doc.file_name, value)}
                            </span>
                            <span className="mt-1 text-xs text-slate-500">
                              {formatBytes(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString("en-US", {
                                month: "2-digit",
                                day: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {total > suggestions.length && (
                    <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-2 sticky bottom-0">
                      <button
                        type="button"
                        onClick={() => applySearch(value.trim())}
                        className="w-full rounded-lg py-1.5 text-center text-xs font-medium text-[#0f2d52] hover:bg-white"
                      >
                        View all {total} results in table
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DocsSearchPanelSkeleton() {
  return (
    <div className="h-[120px] animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
  );
}
