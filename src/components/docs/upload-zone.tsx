"use client";

// ------------------------------------------------------------
// Drag-and-drop upload zone for the /docs page.
//
// UX niceties over a bare dropzone:
//   1. Pre-upload review dialog — whenever a drop contains
//      duplicates OR rejected files (too large / wrong type /
//      over the count limit), we show a single dialog listing
//      EVERY dropped file tagged as: New, Duplicate (will
//      replace), or Ignored (with the reason). All-clean drops
//      (all new, nothing rejected) upload straight away.
//   2. Per-file progress list — each uploading file shows its
//      size and a live status, so the user always knows what's
//      happening. Succeeded rows clear (they appear in the table
//      below); only failures linger with their reason.
//
// react-dropzone enforces client-side constraints (count/size/
// type); uploadDocsAction re-validates and performs replace+insert.
// ------------------------------------------------------------

import { useCallback, useState, useTransition } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/docs/constants";
import { formatBytes } from "@/lib/utils/format";
import {
  uploadDocsAction,
  checkDuplicateNames,
} from "@/app/(dashboard)/docs/actions";

type ItemStatus = "uploading" | "done" | "failed";

interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: ItemStatus;
  reason?: string;
}

interface RejectedEntry {
  name: string;
  size: number;
  reason: string;
}

// Everything a single drop produced, held until the user confirms.
interface PendingReview {
  accepted: File[]; // files that will actually upload
  duplicateNames: string[]; // subset of accepted that replace an existing doc
  rejected: RejectedEntry[]; // ignored files + why
}

// Map a react-dropzone rejection to a short, human reason.
function rejectionReason(rej: FileRejection): string {
  const code = rej.errors[0]?.code;
  if (code === "file-too-large") {
    return `Exceeds the ${formatBytes(MAX_FILE_SIZE_BYTES)} limit`;
  }
  if (code === "file-invalid-type") {
    return "Unsupported file type";
  }
  if (code === "too-many-files") {
    return `Over the ${MAX_FILES_PER_UPLOAD}-file limit`;
  }
  return rej.errors[0]?.message ?? "File rejected";
}

export function UploadZone() {
  const [isPending, startTransition] = useTransition();

  // Visible per-file progress list (persists until the next drop).
  const [items, setItems] = useState<UploadItem[]>([]);

  // Drop held back for the review dialog (duplicates and/or rejects).
  const [review, setReview] = useState<PendingReview | null>(null);

  // >0 while the post-drop duplicate check is running (the brief
  // server round-trip before we upload or show the review dialog).
  // Gives the user explicit feedback during that gap.
  const [checkingCount, setCheckingCount] = useState(0);

  // Kick off the actual upload + reconcile the progress list with
  // the server's per-file result.
  const doUpload = useCallback((files: File[]) => {
    if (files.length === 0) return;

    const queued: UploadItem[] = files.map((f) => ({
      id: `${f.name}-${f.size}-${crypto.randomUUID()}`,
      name: f.name,
      size: f.size,
      status: "uploading",
    }));
    setItems(queued);

    startTransition(async () => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));

      const result = await uploadDocsAction(form);

      if (!result.ok) {
        setItems((prev) =>
          prev.map((it) => ({
            ...it,
            status: "failed",
            reason: result.error,
          })),
        );
        toast.error(result.error);
        return;
      }

      const { uploadedCount, replacedCount, rejected } = result.data;
      const reasonByName = new Map(rejected.map((r) => [r.name, r.reason]));

      // Keep ONLY failed rows in the progress list. Succeeded files
      // now live in the table below (as "Pending"), so leaving them
      // here would just duplicate the same entries on screen.
      setItems((prev) =>
        prev
          .map((it) => {
            const reason = reasonByName.get(it.name);
            return reason
              ? ({ ...it, status: "failed", reason } as UploadItem)
              : ({ ...it, status: "done" } as UploadItem);
          })
          .filter((it) => it.status === "failed"),
      );

      if (uploadedCount > 0) {
        const replacedNote =
          replacedCount > 0 ? ` (${replacedCount} replaced)` : "";
        toast.success(
          `${uploadedCount} file${uploadedCount === 1 ? "" : "s"} uploaded${replacedNote}`,
        );
      }
      for (const r of rejected) toast.error(`${r.name}: ${r.reason}`);
    });
  }, []);

  // react-dropzone splits the batch into accepted/rejected. We ask
  // the server which of the accepted names already exist (a targeted
  // ≤5-name lookup — never enumerates the user's library). A fully
  // clean drop (all-new, nothing rejected) uploads immediately;
  // otherwise we surface the review dialog.
  const onDrop = useCallback(
    async (acceptedRaw: File[], rejections: FileRejection[]) => {
      const rejected: RejectedEntry[] = rejections.map((r) => ({
        name: r.file.name,
        size: r.file.size,
        reason: rejectionReason(r),
      }));

      // Enforce the per-upload cap OURSELVES (react-dropzone's
      // maxFiles rejects the whole batch when exceeded — bad UX).
      // Keep the first N, ignore only the excess with a clear reason.
      const accepted = acceptedRaw.slice(0, MAX_FILES_PER_UPLOAD);
      for (const f of acceptedRaw.slice(MAX_FILES_PER_UPLOAD)) {
        rejected.push({
          name: f.name,
          size: f.size,
          reason: `Only ${MAX_FILES_PER_UPLOAD} files per upload — skipped`,
        });
      }

      let duplicateNames: string[] = [];
      if (accepted.length > 0) {
        setCheckingCount(accepted.length);
        try {
          const res = await checkDuplicateNames(accepted.map((f) => f.name));
          if (res.ok) duplicateNames = res.data.duplicates;
        } finally {
          setCheckingCount(0);
        }
      }

      // Clean drop → no confirmation needed.
      if (duplicateNames.length === 0 && rejected.length === 0) {
        doUpload(accepted);
        return;
      }

      setReview({ accepted, duplicateNames, rejected });
    },
    [doUpload],
  );

  const isChecking = checkingCount > 0;
  const isBusy = isPending || isChecking;

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME_TYPES,
    // No maxFiles here on purpose: react-dropzone rejects the ENTIRE
    // drop when over the limit. We cap to MAX_FILES_PER_UPLOAD inside
    // onDrop so valid files still go through and only the excess is
    // ignored.
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: true,
    disabled: isBusy,
    noClick: true,
    noKeyboard: false,
  });

  const acceptedCount = review?.accepted.length ?? 0;
  const dupCount = review?.duplicateNames.length ?? 0;
  const rejCount = review?.rejected.length ?? 0;

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive
            ? "border-foreground bg-muted/50"
            : "border-border bg-muted/20",
          isBusy ? "pointer-events-none opacity-70" : "",
        ].join(" ")}
      >
        <input {...getInputProps()} />

        {isChecking ? (
          <>
            <Loader2
              className="h-7 w-7 animate-spin text-muted-foreground"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">
                Checking {checkingCount} file
                {checkingCount === 1 ? "" : "s"}…
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Looking for existing documents with the same name
              </p>
            </div>
          </>
        ) : isPending ? (
          <>
            <Loader2
              className="h-7 w-7 animate-spin text-muted-foreground"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">Uploading…</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Saving your files — see progress below
              </p>
            </div>
          </>
        ) : (
          <>
            <UploadCloud
              className="h-7 w-7 text-muted-foreground"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">
                {isDragActive
                  ? "Drop to upload"
                  : "Drag files here, or browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ACCEPTED_EXTENSIONS.join(", ")} · max {MAX_FILES_PER_UPLOAD}{" "}
                files · {formatBytes(MAX_FILE_SIZE_BYTES)} each
              </p>
            </div>
          </>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={open}
          disabled={isBusy}
        >
          {isChecking
            ? "Checking…"
            : isPending
              ? "Uploading…"
              : "Choose files"}
        </Button>
      </div>

      {/* Per-file progress list */}
      {items.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-3 px-3 py-2.5 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{it.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(it.size)}
                  {it.status === "failed" && it.reason ? (
                    <span className="text-destructive"> · {it.reason}</span>
                  ) : null}
                </p>
              </div>
              <StatusIcon status={it.status} />
            </li>
          ))}
        </ul>
      )}

      {/* Pre-upload review: duplicates + ignored files */}
      <AlertDialog
        open={review !== null}
        onOpenChange={(o) => !o && setReview(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review upload</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {acceptedCount > 0 ? (
                    <>
                      <strong>{acceptedCount}</strong> file
                      {acceptedCount === 1 ? "" : "s"} will be uploaded
                      {dupCount > 0 ? (
                        <>
                          {" "}
                          (<strong>{dupCount}</strong> will replace an existing
                          document)
                        </>
                      ) : null}
                      .{" "}
                    </>
                  ) : (
                    <>Nothing will be uploaded. </>
                  )}
                  {rejCount > 0 ? (
                    <>
                      <strong>{rejCount}</strong> file
                      {rejCount === 1 ? " is" : "s are"} ignored.
                    </>
                  ) : null}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* File breakdown */}
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {review?.accepted.map((f) => {
              const isDup = review.duplicateNames.includes(f.name);
              return (
                <li
                  key={`a-${f.name}-${f.size}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {f.name}
                    </p>
                    <p className="text-muted-foreground">
                      {formatBytes(f.size)}
                    </p>
                  </div>
                  {isDup ? (
                    <Badge variant="secondary" className="shrink-0">
                      Duplicate · will replace
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">
                      New
                    </Badge>
                  )}
                </li>
              );
            })}

            {review?.rejected.map((r) => (
              <li
                key={`r-${r.name}-${r.size}`}
                className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {r.name}
                  </p>
                  <p className="text-muted-foreground">
                    {formatBytes(r.size)} · {r.reason}
                  </p>
                </div>
                <Badge variant="destructive" className="shrink-0">
                  Ignored
                </Badge>
              </li>
            ))}
          </ul>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReview(null)}>
              {acceptedCount > 0 ? "Cancel" : "Close"}
            </AlertDialogCancel>
            {acceptedCount > 0 && (
              <AlertDialogAction
                onClick={() => {
                  const files = review?.accepted ?? [];
                  setReview(null);
                  doUpload(files);
                }}
              >
                {dupCount > 0
                  ? `Replace & upload ${acceptedCount}`
                  : `Upload ${acceptedCount}`}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Small status glyph for each file row.
function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === "uploading") {
    return (
      <Loader2
        className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
        aria-label="Uploading"
      />
    );
  }
  if (status === "done") {
    return (
      <CheckCircle2
        className="h-4 w-4 shrink-0 text-foreground"
        aria-label="Uploaded"
      />
    );
  }
  return (
    <XCircle
      className="h-4 w-4 shrink-0 text-destructive"
      aria-label="Failed"
    />
  );
}
