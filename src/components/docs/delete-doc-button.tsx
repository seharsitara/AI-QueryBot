"use client";

// ------------------------------------------------------------
// Per-row delete control. Shows a confirm dialog, calls the
// deleteDocAction server action, and toasts the result. The
// action revalidates /docs so the row disappears automatically
// on next render.
//
// Loading UX:
//   • Dialog is controlled — it stays open while the action is in
//     flight so the user sees the spinner+label there.
//   • The trash button on the row also flips to a spinner while
//     pending, so progress is visible even after the dialog closes.
// ------------------------------------------------------------

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteDocAction } from "@/app/(dashboard)/docs/actions";

interface Props {
  docId: string;
  fileName: string;
}

export function DeleteDocButton({ docId, fileName }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Stop AlertDialogAction's default behaviour of closing the dialog
    // on click — we'll close it ourselves once the action completes.
    e.preventDefault();

    startTransition(async () => {
      const result = await deleteDocAction(docId);
      if (!result.ok) {
        toast.error(result.error);
        // Keep the dialog open so the user can retry / cancel.
        return;
      }
      toast.success(`Deleted "${fileName}"`);
      setOpen(false);
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Don't allow dismiss-by-outside-click while the action is in flight.
        if (isPending) return;
        setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete ${fileName}`}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this document?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{fileName}&quot; will be removed from storage and its
            embeddings from the vector index. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="min-w-[88px]"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting…
              </span>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
