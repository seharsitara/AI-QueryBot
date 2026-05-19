"use client";

// ------------------------------------------------------------
// Per-thread document scope selector.
//
// Renders a single compact "＋" icon button that lives inline in
// the composer toolbar (next to Send). It opens a Popover with a
// checkbox list of the user's COMPLETED docs. When the scope is
// narrowed to specific docs, a small count badge sits on the icon
// — no banner/chips row, to keep the composer tight on small
// laptop screens.
//
// Fully controlled — parent (chat-window) owns `selectedIds` and
// persists changes (server action for existing threads, or sends
// the selection with the first message for brand-new threads).
// ------------------------------------------------------------

import { useMemo, useState } from "react";
import { Plus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBytes } from "@/lib/utils/format";
import type { Doc } from "@/types/doc";

interface DocSelectorProps {
  docs: Doc[]; // completed docs only
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function DocSelector({
  docs,
  selectedIds,
  onChange,
  disabled,
}: DocSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Only keep selections that still point at a live completed doc
  // (a doc may have been deleted since it was picked).
  const selectedDocs = useMemo(
    () => docs.filter((d) => selectedSet.has(d.id)),
    [docs, selectedSet],
  );

  const allSelected = selectedDocs.length === 0; // empty = all

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  const count = selectedDocs.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || docs.length === 0}
          className="relative h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={
            allSelected
              ? `Attach documents — answering from all ${docs.length}`
              : `Attach documents — ${count} selected`
          }
          title={
            allSelected
              ? `Answering from all ${docs.length} document${docs.length === 1 ? "" : "s"}`
              : `${count} document${count === 1 ? "" : "s"} selected`
          }
        >
          <Plus className="h-4 w-4" />
          {!allSelected && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium leading-none text-background">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-xs font-medium">Answer from</p>
          {!allSelected && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear (use all)
            </button>
          )}
        </div>

        {docs.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No processed documents yet.
          </p>
        ) : (
          // Force Radix's table-display viewport child to block so
          // long unbroken filenames truncate instead of stretching
          // the popover.
          <ScrollArea className="max-h-64 [&>[data-radix-scroll-area-viewport]>div]:!block">
            <ul className="p-1">
              {docs.map((d) => {
                const checked = selectedSet.has(d.id);
                return (
                  <li key={d.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-xs hover:bg-muted",
                        checked && "bg-muted/60",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(d.id)}
                        className="shrink-0"
                      />
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {d.file_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
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
