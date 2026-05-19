"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleRefresh}
      className="border-slate-200 text-[#0f2d52] hover:bg-slate-50"
    >
      <RefreshCw
        className={cn("h-4 w-4", isPending && "animate-spin")}
        aria-hidden
      />
      {isPending ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
