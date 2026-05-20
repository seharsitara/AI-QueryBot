"use client";

// ------------------------------------------------------------
// Per-row summary control. Generates an AI summary for a completed
// document and lets the user download it as a PDF.
// ------------------------------------------------------------

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateDocSummaryAction } from "@/app/(dashboard)/docs/actions";
import { downloadSummaryPdf } from "@/lib/docs/summary-pdf";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  docId: string;
  fileName: string;
  status: string;
}

export function GenerateSummaryButton({ docId, fileName, status }: Props) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSummarize = status === "completed";

  const handleOpen = () => {
    if (!canSummarize) return;
    setSummary(null);
    setError(null);
    setOpen(true);

    startTransition(async () => {
      const result = await generateDocSummaryAction(docId);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setSummary(result.data.summary);
    });
  };

  const handleDownload = () => {
    if (!summary) return;
    downloadSummaryPdf({ fileName, summary });
    toast.success("Summary PDF downloaded");
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Generate summary for ${fileName}`}
        disabled={!canSummarize || isPending}
        onClick={handleOpen}
        title={
          canSummarize
            ? "Generate summary"
            : "Available after document is processed"
        }
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (isPending) return;
          setOpen(next);
          if (!next) {
            setSummary(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#0f2d52]">
              Document summary
            </DialogTitle>
            <DialogDescription className="truncate" title={fileName}>
              {fileName}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[min(60vh,420px)] rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            {isPending && (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#0f2d52]" />
                <p className="text-sm text-slate-600">Generating summary…</p>
              </div>
            )}

            {!isPending && error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {!isPending && summary && (
              <div className="prose prose-sm max-w-none text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summary}
                </ReactMarkdown>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Close
            </Button>
            <Button
              type="button"
              className="bg-[#0f2d52] hover:bg-[#0c2442]"
              onClick={handleDownload}
              disabled={!summary || isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
