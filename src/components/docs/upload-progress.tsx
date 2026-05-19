"use client";

import {
  CheckCircle2,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";

import { formatBytes } from "@/lib/utils/format";

export type FileUploadPhase =
  | "queued"
  | "checking"
  | "uploading"
  | "success"
  | "failed";

export interface UploadProgressItem {
  id: string;
  name: string;
  size: number;
  phase: FileUploadPhase;
  progress: number;
  reason?: string;
}

const phaseLabel: Record<FileUploadPhase, string> = {
  queued: "Waiting",
  checking: "Checking for duplicates",
  uploading: "Saving to your library",
  success: "Uploaded",
  failed: "Failed",
};

function PhaseIcon({ phase }: { phase: FileUploadPhase }) {
  if (phase === "success") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  }
  if (phase === "failed") {
    return <XCircle className="h-4 w-4 shrink-0 text-red-600" />;
  }
  if (phase === "queued") {
    return (
      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-200" />
    );
  }
  return (
    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#0f2d52]" />
  );
}

export function UploadProgress({
  items,
  overallLabel,
  overallPercent,
}: {
  items: UploadProgressItem[];
  overallLabel: string;
  overallPercent: number;
}) {
  if (items.length === 0) return null;

  const finishedCount = items.filter(
    (i) => i.phase === "success" || i.phase === "failed",
  ).length;
  const inProgress = items.length - finishedCount;
  const allDone = finishedCount === items.length;

  const counterLabel = allDone
    ? `${finishedCount} of ${items.length} complete`
    : inProgress === items.length
      ? `Processing ${items.length} file${items.length === 1 ? "" : "s"}`
      : `${finishedCount} of ${items.length} done, ${inProgress} in progress`;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0f2d52]">
              Upload progress
            </p>
            <p className="text-xs text-slate-500">{overallLabel}</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-slate-500">
            {counterLabel}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#0f2d52] transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, overallPercent))}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-[#0f2d52]">
            {overallPercent}%
          </span>
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#0f2d52]">
                {item.name}
              </p>
              <p className="text-xs text-slate-500">
                {formatBytes(item.size)} - {phaseLabel[item.phase]}
                {item.phase === "failed" && item.reason
                  ? ` - ${item.reason}`
                  : null}
              </p>
            </div>
            <PhaseIcon phase={item.phase} />
          </li>
        ))}
      </ul>
    </div>
  );
}
