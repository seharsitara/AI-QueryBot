// ------------------------------------------------------------
// /docs · upload + manage memory documents
//
// Server component. Reads `?q=` (file-name search) and `?page=`
// from the URL and renders a paginated, searchable table. The
// search/pagination controls are client islands that just push
// new query params; this component re-fetches on each change.
// ------------------------------------------------------------

import { listDocsPage } from "@/repositories/docs";
import { requireUser } from "@/lib/auth/get-user";
import { DocsTable } from "@/components/docs/docs-table";
import { UploadZone } from "@/components/docs/upload-zone";
import { RefreshButton } from "@/components/docs/refresh-button";
import { DocsSearch } from "@/components/docs/docs-search";
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload .pdf, .docx, and .txt files. Documents are processed in the
              background — use Refresh to see the latest status.
            </p>
          </div>
          <RefreshButton />
        </div>

        <div className="space-y-6">
          <UploadZone />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <DocsSearch />
              <DocsPagination
                page={pageNum}
                pageSize={PAGE_SIZE}
                total={total}
              />
            </div>

            {docs.length === 0 && q ? (
              <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                No documents match “{q}”.
              </div>
            ) : (
              <DocsTable docs={docs} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
