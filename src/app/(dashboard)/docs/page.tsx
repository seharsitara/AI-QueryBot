import { listDocsPage } from "@/repositories/docs";
import { requireUser } from "@/lib/auth/get-user";
import { UploadZone } from "@/components/docs/upload-zone";
import { RefreshButton } from "@/components/docs/refresh-button";
import { DocsLibrary } from "@/components/docs/docs-library";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function DocsPage() {
  await requireUser();

  const { docs, total } = await listDocsPage({
    page: 1,
    pageSize: PAGE_SIZE,
  });

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
          <DocsLibrary
            initialDocs={docs}
            initialTotal={total}
            initialPage={1}
            pageSize={PAGE_SIZE}
          >
            <UploadZone />
          </DocsLibrary>
        </div>
      </div>
    </div>
  );
}
