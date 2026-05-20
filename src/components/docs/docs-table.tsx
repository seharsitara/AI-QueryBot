import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { DeleteDocButton } from "./delete-doc-button";
import { GenerateSummaryButton } from "./generate-summary-button";
import { DocName } from "./doc-name";
import type { Doc } from "@/types/doc";
import { formatBytes, formatRelative } from "@/lib/utils/format";
import { FileText } from "lucide-react";

interface Props {
  docs: Doc[];
  searchQuery?: string;
}

export function DocsTable({ docs, searchQuery }: Props) {
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
        <FileText className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-[#0f2d52]">No documents yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Upload files above to build your knowledge base
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="font-semibold text-[#0f2d52]">Name</TableHead>
            <TableHead className="font-semibold text-[#0f2d52]">Size</TableHead>
            <TableHead className="font-semibold text-[#0f2d52]">
              Status
            </TableHead>
            <TableHead className="font-semibold text-[#0f2d52]">
              Chunks
            </TableHead>
            <TableHead className="font-semibold text-[#0f2d52]">
              Uploaded
            </TableHead>
            <TableHead className="font-semibold text-[#0f2d52]">
              Processed
            </TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((doc) => (
            <TableRow
              key={doc.id}
              id={`doc-row-${doc.id}`}
              className="scroll-mt-24 hover:bg-slate-50/50"
            >
              <TableCell className="max-w-xs font-medium">
                <DocName
                  docId={doc.id}
                  fileName={doc.file_name}
                  status={doc.status}
                  chunksCount={doc.chunks_count}
                  searchQuery={searchQuery}
                />
                {doc.status === "failed" && doc.error_message ? (
                  <p
                    className="mt-1 line-clamp-2 text-xs text-red-600"
                    title={doc.error_message}
                  >
                    {doc.error_message}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {formatBytes(doc.file_size)}
              </TableCell>
              <TableCell>
                <StatusBadge status={doc.status} />
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {doc.chunks_count || "—"}
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {formatRelative(doc.created_at)}
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {formatRelative(doc.processed_at)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-0.5">
                  <GenerateSummaryButton
                    docId={doc.id}
                    fileName={doc.file_name}
                    status={doc.status}
                  />
                  <DeleteDocButton docId={doc.id} fileName={doc.file_name} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
