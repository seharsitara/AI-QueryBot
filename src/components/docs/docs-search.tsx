"use client";

// ------------------------------------------------------------
// Debounced file-name search for the Documents table. Writes the
// query to the URL (?q=) and resets pagination (drops ?page), so
// the server component re-fetches the filtered first page.
// ------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DocsSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input in sync if the URL changes externally
  // (e.g. browser back/forward).
  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set("q", next.trim());
    else params.delete("q");
    params.delete("page"); // new search → back to page 1
    router.replace(`${pathname}?${params.toString()}`);
  }

  function onChange(next: string) {
    setValue(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push(next), 350);
  }

  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search documents…"
        className="h-9 pl-9 pr-8 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            if (debounce.current) clearTimeout(debounce.current);
            push("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
