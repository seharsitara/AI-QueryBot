// ------------------------------------------------------------
// Pure presentational table of the user's uploaded documents.
//
// Server component: receives `docs` as a prop (fetched in the
// /docs page) and renders rows. The delete control is an island
// of interactivity (DeleteDocButton) — everything else is static.
// Status updates are pulled in manually via the RefreshButton on
// the page.
// ------------------------------------------------------------

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
import { DocName } from "./doc-name";
import type { Doc } from "@/types/doc";
import { formatBytes, formatRelative } from "@/lib/utils/format";

interface Props {
  docs: Doc[];
}

export function DocsTable({ docs }: Props) {
  if (docs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        No documents yet. Upload one above to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Chunks</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead>Processed</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="max-w-xs font-medium">
              <DocName
                docId={doc.id}
                fileName={doc.file_name}
                status={doc.status}
                chunksCount={doc.chunks_count}
              />
              {doc.status === "failed" && doc.error_message ? (
                <p
                  className="mt-1 line-clamp-2 text-xs text-destructive"
                  title={doc.error_message}
                >
                  {doc.error_message}
                </p>
              ) : null}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatBytes(doc.file_size)}
            </TableCell>
            <TableCell>
              <StatusBadge status={doc.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {doc.chunks_count || "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatRelative(doc.created_at)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatRelative(doc.processed_at)}
            </TableCell>
            <TableCell className="text-right">
              <DeleteDocButton docId={doc.id} fileName={doc.file_name} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
