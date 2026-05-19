"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { FileUp, UploadCloud, Loader2 } from "lucide-react";
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
import {
  UploadProgress,
  type FileUploadPhase,
  type UploadProgressItem,
} from "./upload-progress";

interface RejectedEntry {
  name: string;
  size: number;
  reason: string;
}

interface PendingReview {
  accepted: File[];
  duplicateNames: string[];
  rejected: RejectedEntry[];
}

type SessionPhase = "idle" | "checking" | "uploading" | "done";

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

function makeItems(
  files: File[],
  phase: FileUploadPhase,
  progress = 0,
): UploadProgressItem[] {
  return files.map((f) => ({
    id: `${f.name}-${f.size}-${crypto.randomUUID()}`,
    name: f.name,
    size: f.size,
    phase,
    progress,
  }));
}

export function UploadZone() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<UploadProgressItem[]>([]);
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("idle");
  const [review, setReview] = useState<PendingReview | null>(null);

  const isBusy = sessionPhase === "checking" || sessionPhase === "uploading";

  useEffect(() => {
    if (sessionPhase === "checking") {
      const tick = setInterval(() => {
        setItems((prev) =>
          prev.map((it) =>
            it.phase === "checking" && it.progress < 32
              ? { ...it, progress: it.progress + 4 }
              : it,
          ),
        );
      }, 120);
      return () => clearInterval(tick);
    }
    if (sessionPhase === "uploading") {
      const tick = setInterval(() => {
        setItems((prev) =>
          prev.map((it) =>
            it.phase === "uploading" && it.progress < 92
              ? { ...it, progress: it.progress + 3 }
              : it,
          ),
        );
      }, 160);
      return () => clearInterval(tick);
    }
  }, [sessionPhase]);

  const overallPercent =
    items.length === 0
      ? 0
      : Math.round(
          items.reduce((sum, it) => sum + it.progress, 0) / items.length,
        );

  const overallLabel =
    sessionPhase === "checking"
      ? "Step 1 of 2: Checking for duplicate file names"
      : sessionPhase === "uploading"
        ? "Step 2 of 2: Uploading to your library"
        : sessionPhase === "done"
          ? "Upload complete - see your documents in the table below"
          : "Ready to upload";

  const doUpload = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      setItems((prev) =>
        prev.length > 0
          ? prev.map((it) => ({
              ...it,
              phase: "uploading" as const,
              progress: Math.max(40, it.progress),
            }))
          : makeItems(files, "uploading", 40),
      );
      setSessionPhase("uploading");

      startTransition(async () => {
        const form = new FormData();
        files.forEach((f) => form.append("files", f));

        const result = await uploadDocsAction(form);

        if (!result.ok) {
          setItems((prev) =>
            prev.map((it) => ({
              ...it,
              phase: "failed" as const,
              progress: 100,
              reason: result.error,
            })),
          );
          setSessionPhase("done");
          toast.error(result.error);
          return;
        }

        const { uploadedCount, replacedCount, rejected } = result.data;
        const reasonByName = new Map(rejected.map((r) => [r.name, r.reason]));

        setItems((prev) =>
          prev.map((it) => {
            const reason = reasonByName.get(it.name);
            if (reason) {
              return {
                ...it,
                phase: "failed" as const,
                progress: 100,
                reason,
              };
            }
            return { ...it, phase: "success" as const, progress: 100 };
          }),
        );
        setSessionPhase("done");

        if (uploadedCount > 0) {
          const replacedNote =
            replacedCount > 0 ? ` (${replacedCount} replaced)` : "";
          toast.success(
            `${uploadedCount} file${uploadedCount === 1 ? "" : "s"} uploaded${replacedNote}. Processing continues in the background.`,
          );
          router.refresh();
        }
        for (const r of rejected) toast.error(`${r.name}: ${r.reason}`);

        setTimeout(() => {
          setItems((prev) => prev.filter((it) => it.phase === "failed"));
          setSessionPhase("idle");
        }, 4000);
      });
    },
    [router],
  );

  const onDrop = useCallback(
    async (acceptedRaw: File[], rejections: FileRejection[]) => {
      const rejected: RejectedEntry[] = rejections.map((r) => ({
        name: r.file.name,
        size: r.file.size,
        reason: rejectionReason(r),
      }));

      const accepted = acceptedRaw.slice(0, MAX_FILES_PER_UPLOAD);
      for (const f of acceptedRaw.slice(MAX_FILES_PER_UPLOAD)) {
        rejected.push({
          name: f.name,
          size: f.size,
          reason: `Only ${MAX_FILES_PER_UPLOAD} files per upload - skipped`,
        });
      }

      if (accepted.length === 0 && rejected.length > 0) {
        setItems(
          rejected.map((r) => ({
            id: `${r.name}-${r.size}-${crypto.randomUUID()}`,
            name: r.name,
            size: r.size,
            phase: "failed" as const,
            progress: 100,
            reason: r.reason,
          })),
        );
        setSessionPhase("done");
        for (const r of rejected) toast.error(`${r.name}: ${r.reason}`);
        return;
      }

      if (accepted.length > 0) {
        setItems(makeItems(accepted, "checking", 8));
        setSessionPhase("checking");
      }

      let duplicateNames: string[] = [];
      if (accepted.length > 0) {
        const res = await checkDuplicateNames(accepted.map((f) => f.name));
        if (res.ok) duplicateNames = res.data.duplicates;
      }

      if (duplicateNames.length === 0 && rejected.length === 0) {
        doUpload(accepted);
        return;
      }

      setSessionPhase("idle");
      setItems([]);
      setReview({ accepted, duplicateNames, rejected });
    },
    [doUpload],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME_TYPES,
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
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2d52]">
              <FileUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#0f2d52]">
                Upload documents
              </h2>
              <p className="text-xs text-slate-500">
                PDF, Word, and text files - processed automatically after upload
              </p>
            </div>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={[
            "m-4 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 text-center transition-all",
            isDragActive
              ? "border-[#0f2d52] bg-blue-50/50"
              : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50",
            isBusy ? "pointer-events-none opacity-80" : "",
          ].join(" ")}
        >
          <input {...getInputProps()} />

          {isBusy && items.length > 0 ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-[#0f2d52]" />
              <div>
                <p className="text-sm font-semibold text-[#0f2d52]">
                  Processing your upload
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Track each file in the progress panel below
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f2d52]/10">
                <UploadCloud className="h-7 w-7 text-[#0f2d52]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2d52]">
                  {isDragActive
                    ? "Drop files to upload"
                    : "Drag and drop files here"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {ACCEPTED_EXTENSIONS.join(", ")} - up to{" "}
                  {MAX_FILES_PER_UPLOAD} files -{" "}
                  {formatBytes(MAX_FILE_SIZE_BYTES)} each
                </p>
              </div>
            </>
          )}

          <Button
            type="button"
            className="rounded-lg bg-[#0f2d52] text-white hover:bg-[#0c2442]"
            onClick={open}
            disabled={isBusy}
          >
            {isBusy ? "Please wait..." : "Browse files"}
          </Button>
        </div>
      </div>

      <UploadProgress
        items={items}
        overallLabel={overallLabel}
        overallPercent={overallPercent}
      />

      <AlertDialog
        open={review !== null}
        onOpenChange={(o) => !o && setReview(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0f2d52]">
              Review upload
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-slate-600">
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

          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {review?.accepted.map((f) => {
              const isDup = review.duplicateNames.includes(f.name);
              return (
                <li
                  key={`a-${f.name}-${f.size}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#0f2d52]">
                      {f.name}
                    </p>
                    <p className="text-slate-500">{formatBytes(f.size)}</p>
                  </div>
                  {isDup ? (
                    <Badge className="shrink-0 bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Duplicate - will replace
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
                className="flex items-center justify-between gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#0f2d52]">
                    {r.name}
                  </p>
                  <p className="text-slate-500">
                    {formatBytes(r.size)} - {r.reason}
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
                className="bg-[#0f2d52] hover:bg-[#0c2442]"
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
