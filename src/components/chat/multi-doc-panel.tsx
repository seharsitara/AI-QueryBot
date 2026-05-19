"use client";

import { useMemo } from "react";
import { FileText, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils/format";
import type { Doc } from "@/types/doc";

interface MultiDocPanelProps {
  docs: Doc[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function MultiDocPanel({
  docs,
  selectedIds,
  onChange,
  disabled,
}: MultiDocPanelProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function selectAll() {
    onChange(docs.map((d) => d.id));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f2d52]">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0f2d52]">Documents</p>
            <p className="text-[10px] text-slate-500">
              {selectedIds.length} of {docs.length} selected
            </p>
          </div>
        </div>
        {docs.length > 0 && (
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={selectAll}
              disabled={disabled || selectedIds.length === docs.length}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={clearAll}
              disabled={disabled || selectedIds.length === 0}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {docs.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-slate-500">
            No processed documents yet. Upload files on the Documents page
            first.
          </p>
        ) : (
          <ul className="space-y-1">
            {docs.map((d) => {
              const checked = selectedSet.has(d.id);
              return (
                <li key={d.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2.5 transition-colors",
                      checked
                        ? "border-[#0f2d52]/30 bg-blue-50/60"
                        : "border-transparent hover:bg-slate-50",
                      disabled && "pointer-events-none opacity-60",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(d.id)}
                      className="mt-0.5 shrink-0"
                    />
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-[#0f2d52]">
                        {d.file_name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatBytes(d.file_size)} - {d.chunks_count} chunk
                        {d.chunks_count === 1 ? "" : "s"}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedIds.length === 0 && docs.length > 0 && (
        <p className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-900">
          Select at least one document to start chatting.
        </p>
      )}
    </div>
  );
}
