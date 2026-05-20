"use client";

import { useMemo, useState } from "react";
import { FileText, Layers, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils/format";
import type { Doc } from "@/types/doc";

interface MultiDocSelectorProps {
  docs: Doc[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function MultiDocSelector({
  docs,
  selectedIds,
  onChange,
  disabled,
}: MultiDocSelectorProps) {
  const [filter, setFilter] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredDocs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.file_name.toLowerCase().includes(q));
  }, [docs, filter]);

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function selectAll() {
    const ids = new Set(selectedIds);
    for (const d of filteredDocs) ids.add(d.id);
    onChange(Array.from(ids));
  }

  function clearAll() {
    onChange([]);
  }

  const label =
    selectedIds.length === 0
      ? "Select documents"
      : `${selectedIds.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || docs.length === 0}
          className="h-8 gap-1.5 border-slate-200 text-xs text-[#0f2d52]"
        >
          <Layers className="h-3.5 w-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-slate-100 px-3 py-2.5">
          <p className="text-xs font-semibold text-[#0f2d52]">Documents</p>
          <p className="text-[10px] text-slate-500">
            {selectedIds.length} of {docs.length} selected for this chat
          </p>
          {docs.length > 0 && (
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search documents…"
                className="h-8 border-slate-200 bg-white pl-8 text-xs shadow-none"
              />
            </div>
          )}
          {docs.length > 0 && (
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={selectAll}
                disabled={
                  disabled ||
                  filteredDocs.length === 0 ||
                  filteredDocs.every((d) => selectedSet.has(d.id))
                }
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

        {docs.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-slate-500">
            No processed documents yet. Upload files on the Documents page
            first.
          </p>
        ) : filteredDocs.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-slate-500">
            No documents match &ldquo;{filter.trim()}&rdquo;.
          </p>
        ) : (
          <ScrollArea className="max-h-72 [&>[data-radix-scroll-area-viewport]>div]:!block">
            <ul className="p-1.5">
              {filteredDocs.map((d) => {
                const checked = selectedSet.has(d.id);
                return (
                  <li key={d.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 transition-colors",
                        checked
                          ? "border-[#0f2d52]/25 bg-blue-50/50"
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
                          {formatBytes(d.file_size)} · {d.chunks_count} chunk
                          {d.chunks_count === 1 ? "" : "s"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
