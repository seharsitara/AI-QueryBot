// ------------------------------------------------------------
// Display helpers shared across the dashboard UI.
// Pure functions only — no side effects, no I/O.
// ------------------------------------------------------------

// Bytes → human-readable size, max 1 decimal place.
//   formatBytes(2048)         → "2 KB"
//   formatBytes(1_572_864)    → "1.5 MB"
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0]!;
  for (let i = 1; i < units.length && value >= 1024; i++) {
    value /= 1024;
    unit = units[i]!;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit}`;
}

// ISO timestamp → short relative string ("2 min ago", "yesterday", "Mar 14").
// Null/undefined input renders as "—".
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
