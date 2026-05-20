"use client";

// ------------------------------------------------------------
// Sidebar threads list.
//
//   • Splits threads into "Bookmarked" and "Recent" sections.
//   • Per-row: bookmark toggle (star) + delete (trash).
//   • Delete uses a controlled confirm dialog that stays open
//     while the action runs (proper loading), with a spinner on
//     both the dialog button and the row's trash icon.
// ------------------------------------------------------------

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Trash2, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  deleteThreadAction,
  toggleThreadBookmarkAction,
} from "@/app/(dashboard)/chat/actions";
import type { Thread } from "@/types/thread";

interface ThreadsListProps {
  threads: Thread[];
}

export function ThreadsList({ threads }: ThreadsListProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [pendingDelete, setPendingDelete] = useState<Thread | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [, startBookmark] = useTransition();
  // Which thread's bookmark toggle is mid-flight (subtle row state).
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);

  function confirmDelete(e: React.MouseEvent) {
    // Stop AlertDialogAction's default close-on-click so the dialog
    // stays open (with its spinner) until the action resolves.
    e.preventDefault();
    if (!pendingDelete) return;
    const target = pendingDelete;
    const isViewing =
      pathname === `/chat/${target.id}` ||
      pathname === `/chat/multi/${target.id}`;

    startDelete(async () => {
      const result = await deleteThreadAction({
        threadId: target.id,
        redirectAway: isViewing,
      });
      if (result.ok) {
        setPendingDelete(null);
        router.refresh();
      }
    });
  }

  function toggleBookmark(thread: Thread) {
    setBookmarkingId(thread.id);
    startBookmark(async () => {
      await toggleThreadBookmarkAction({
        threadId: thread.id,
        bookmarked: !thread.is_bookmarked,
      });
      setBookmarkingId(null);
      router.refresh();
    });
  }

  const bookmarked = threads.filter((t) => t.is_bookmarked);
  const recent = threads.filter((t) => !t.is_bookmarked);

  function threadHref(thread: Thread) {
    const ids = thread.selected_doc_ids ?? [];
    return ids.length > 0 ? `/chat/multi/${thread.id}` : `/chat/${thread.id}`;
  }

  const renderRow = (thread: Thread) => {
    const href = threadHref(thread);
    const isActive = pathname === href;
    const isRowDeleting = isDeleting && pendingDelete?.id === thread.id;
    const isRowBookmarking = bookmarkingId === thread.id;
    return (
      <li key={thread.id} className="group/thread relative w-full max-w-full overflow-hidden">
        <Link
          href={href}
          className={cn(
            "flex w-full items-center gap-2 overflow-hidden rounded-md py-1.5 pl-2 pr-[3.25rem] text-xs transition-colors",
            isActive
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <MessageSquare className="h-3 w-3 shrink-0" />
          <span
            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
            title={thread.title}
          >
            {thread.title}
          </span>
        </Link>

        {/* Row actions — always visible (subtle), emphasised on hover */}
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleBookmark(thread);
            }}
            disabled={isRowBookmarking}
            className={cn(
              "rounded p-1 hover:bg-background hover:text-foreground",
              thread.is_bookmarked
                ? "text-foreground"
                : "text-muted-foreground/60",
            )}
            aria-label={
              thread.is_bookmarked ? "Remove bookmark" : "Bookmark chat"
            }
          >
            {isRowBookmarking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Star
                className="h-3 w-3"
                fill={thread.is_bookmarked ? "currentColor" : "none"}
              />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPendingDelete(thread);
            }}
            className="rounded p-1 text-muted-foreground/60 hover:bg-background hover:text-foreground"
            aria-label={`Delete chat "${thread.title}"`}
          >
            {isRowDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </button>
        </div>
      </li>
    );
  };

  return (
    <>
      {/* Plain overflow container (NOT Radix ScrollArea): its viewport
          wraps content in a max-content table that defeats truncate
          and lets long titles push the row past the sidebar width. */}
      <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-2">
        {/* Bookmarked — always shown, with an empty state */}
        <p className="flex items-center gap-1 px-4 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Star className="h-2.5 w-2.5" fill="currentColor" />
          Bookmarked
        </p>
        {bookmarked.length > 0 ? (
          <ul className="mb-2 flex flex-col gap-0.5 px-2">
            {bookmarked.map(renderRow)}
          </ul>
        ) : (
          <p className="mb-2 px-4 py-1 text-[11px] text-muted-foreground/70">
            No bookmarked chats yet — star a chat to pin it here.
          </p>
        )}

        {/* Recent — always shown, with an empty state */}
        <p className="px-4 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Recent
        </p>
        {recent.length > 0 ? (
          <ul className="flex flex-col gap-0.5 px-2">
            {recent.map(renderRow)}
          </ul>
        ) : (
          <p className="px-4 py-1 text-[11px] text-muted-foreground/70">
            No chats yet. Start a new one above.
          </p>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (isDeleting) return; // lock while deleting
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (
                <>
                  &quot;{pendingDelete.title}&quot; and all of its messages
                  will be permanently removed. This can&apos;t be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="min-w-[88px]"
            >
              {isDeleting ? (
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
    </>
  );
}
