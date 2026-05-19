// ------------------------------------------------------------
// Tiny presentational badge for memory_docs.status.
// Black-and-white only — variants signal state via fill, not hue.
// ------------------------------------------------------------

import { Badge } from "@/components/ui/badge";
import type { DocStatus } from "@/types/doc";

const LABELS: Record<DocStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: DocStatus }) {
  // Map status → variant. `default` (filled) for terminal-good,
  // `outline` for in-flight, `destructive` for failure.
  const variant: "default" | "outline" | "secondary" | "destructive" =
    status === "completed"
      ? "default"
      : status === "failed"
        ? "destructive"
        : status === "processing"
          ? "secondary"
          : "outline";

  return <Badge variant={variant}>{LABELS[status]}</Badge>;
}
