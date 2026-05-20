import { Suspense } from "react";
import { listDocsPage } from "@/repositories/docs";
import { requireUser } from "@/lib/auth/get-user";
import { DocsTable } from "@/components/docs/docs-table";
import { UploadZone } from "@/components/docs/upload-zone";
import { RefreshButton } from "@/components/docs/refresh-button";
import {
  DocsSearchPanel,
  DocsSearchPanelSkeleton,
} from "@/components/docs/docs-search-panel";
import { DocsPagination } from "@/components/docs/docs-pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireUser();

  const { q, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);

  const { docs, total } = await listDocsPage({
    q,
    page: pageNum,
    pageSize: PAGE_SIZE,
  });

  const hasSearch = Boolean(q?.trim());

  return (
    <div className="h-full overflow-y-auto bg-[#f8fafc]">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f2d52]">
              Documents
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload files, search your library, and track processing status.
            </p>
          </div>
          <RefreshButton />
        </div>

        <div className="space-y-6">
          <Suspense fallback={<DocsSearchPanelSkeleton />}>
            <DocsSearchPanel />
          </Suspense>

          <UploadZone />

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
                    : `${total} document${total === 1 ? "" : "s"}${q ? ` matching "${q}"` : ""}`}
                </p>
              </div>
              <DocsPagination
                page={pageNum}
                pageSize={PAGE_SIZE}
                total={total}
              />
            </div>

            <div className="p-4 sm:p-5">
              {docs.length === 0 && hasSearch ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center">
                  <p className="text-sm font-medium text-[#0f2d52]">
                    No matching documents
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-slate-500">
                    Nothing found for &ldquo;{q}&rdquo;. Try a different file
                    name or clear the search above.
                  </p>
                </div>
              ) : (
                <DocsTable docs={docs} searchQuery={q} />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
