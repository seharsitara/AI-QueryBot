import { Badge } from "@/components/ui/badge";
import type { DocStatus } from "@/types/doc";
import { cn } from "@/lib/utils";

const LABELS: Record<DocStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const styles: Record<DocStatus, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50",
  processing:
    "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-50",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50",
  failed: "border-red-200 bg-red-50 text-red-800 hover:bg-red-50",
};

export function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {LABELS[status]}
    </Badge>
  );
}
