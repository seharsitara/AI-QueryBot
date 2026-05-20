"use client";

import { useCallback, useEffect, useState } from "react";
import { listDocsPageAction } from "@/app/(dashboard)/docs/actions";
import { DocsSearchPanel } from "./docs-search-panel";
import { DocsTable } from "./docs-table";
import { DocsPagination } from "./docs-pagination";
import type { Doc } from "@/types/doc";

type DocsLibraryProps = {
  initialDocs: Doc[];
  initialTotal: number;
  initialPage: number;
  pageSize: number;
  children?: React.ReactNode;
};

export function DocsLibrary({
  initialDocs,
  initialTotal,
  initialPage,
  pageSize,
  children,
}: DocsLibraryProps) {
  const [tableQuery, setTableQuery] = useState("");
  const [docs, setDocs] = useState(initialDocs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDocs(initialDocs);
    setTotal(initialTotal);
    setPage(initialPage);
  }, [initialDocs, initialTotal, initialPage]);

  const loadPage = useCallback(
    async (q: string, nextPage: number) => {
      setLoading(true);
      const res = await listDocsPageAction({
        q: q.trim() || undefined,
        page: nextPage,
        pageSize,
      });
      setLoading(false);

      if (res.ok) {
        setDocs(res.data.docs);
        setTotal(res.data.total);
        setPage(res.data.page);
      }
    },
    [pageSize],
  );

  const handleTableFilter = useCallback(
    (q: string) => {
      setTableQuery(q);
      void loadPage(q, 1);
    },
    [loadPage],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      void loadPage(tableQuery, nextPage);
    },
    [loadPage, tableQuery],
  );

  const hasSearch = Boolean(tableQuery.trim());

  return (
    <>
      <DocsSearchPanel
        onTableFilterChange={handleTableFilter}
        isTableLoading={loading}
      />

      {children}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#0f2d52]">
              Your documents
            </h2>
            <p className="text-xs text-slate-500">
              {total === 0
                ? hasSearch
                  ? "No documents match your search"
                  : "No files uploaded yet"
                : `${total} document${total === 1 ? "" : "s"}${hasSearch ? ` matching "${tableQuery.trim()}"` : ""}`}
            </p>
          </div>
          <DocsPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={handlePageChange}
            disabled={loading}
          />
        </div>

        <div className="p-4 sm:p-5">
          {docs.length === 0 && hasSearch ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center">
              <p className="text-sm font-medium text-[#0f2d52]">
                No matching documents
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Nothing found for &ldquo;{tableQuery.trim()}&rdquo;. Try a
                different file name or clear the search above.
              </p>
            </div>
          ) : (
            <DocsTable
              docs={docs}
              searchQuery={hasSearch ? tableQuery : undefined}
            />
          )}
        </div>
      </section>
    </>
  );
}
