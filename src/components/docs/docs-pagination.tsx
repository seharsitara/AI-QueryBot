"use client";

// ------------------------------------------------------------
// Prev/Next pagination for the Documents table. Preserves the
// current search (?q=) and only changes ?page=.
// ------------------------------------------------------------

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocsPaginationProps {
  page: number;
  pageSize: number;
  total: number;
}

export function DocsPagination({ page, pageSize, total }: DocsPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  function go(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.replace(`${pathname}?${params.toString()}`);
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
      <span>
        {from}–{to} of {total} document{total === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </Button>
        <span className="tabular-nums">
          Page {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
