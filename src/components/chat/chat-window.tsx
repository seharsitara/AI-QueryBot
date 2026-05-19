"use client";

// ------------------------------------------------------------
// The interactive chat surface. Drives Vercel AI SDK's useChat
// hook against /api/chat, and hosts:
//   • the per-thread document selector (composer toolbar)
//   • a resizable right-side document preview pane
//
// State owned here (single source of truth, prop-drilled down):
//   • selectedDocIds  — thread document scope
//   • previewOpen / previewDocId / previewHighlight — preview pane
//
// Persistence:
//   • Existing thread → selection changes saved via
//     updateThreadSelectedDocsAction.
//   • Brand-new thread → selection rides with the first /api/chat
//     request (prepareSendMessagesRequest body) and the server
//     seeds it onto the created thread.
// ------------------------------------------------------------

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { ImperativePanelHandle } from "react-resizable-panels";
import Link from "next/link";
import { Send, FileWarning, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { DocSelector } from "./doc-selector";
import { PreviewPane } from "./preview-pane";
import { ChunkModal } from "./chunk-modal";
import { updateThreadSelectedDocsAction } from "@/app/(dashboard)/chat/actions";
import type { Doc } from "@/types/doc";
import type { RetrievedChunkForUi } from "@/types/message";

interface ChatWindowProps {
  threadId: string | null;
  initialMessages?: UIMessage[];
  // Completed docs the user can scope to / preview.
  completedDocs: Doc[];
  // Persisted thread scope (empty = all). Ignored for new chats.
  initialSelectedDocIds: string[];
}

export function ChatWindow({
  threadId,
  initialMessages,
  completedDocs,
  initialSelectedDocIds,
}: ChatWindowProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasCompletedDocs = completedDocs.length > 0;

  // --- Document scope ---
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    initialSelectedDocIds,
  );
  const selectedIdsRef = useRef<string[]>(initialSelectedDocIds);
  const [, startSaveScope] = useTransition();

  // --- Preview pane ---
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const previewPanelRef = useRef<ImperativePanelHandle>(null);

  // --- Retrieved-chunk modal ---
  const [activeChunk, setActiveChunk] = useState<RetrievedChunkForUi | null>(
    null,
  );

  // Track the latest threadId so we can navigate after the server
  // creates a fresh one (kept in a ref to avoid rebuilding transport).
  const threadIdRef = useRef<string | null>(threadId);

  // Transport: body built per-request so we always send the latest
  // threadId + document scope.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            threadId: threadIdRef.current,
            selectedDocIds: selectedIdsRef.current,
            messages,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: initialMessages,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const isAwaitingFirstToken =
    status === "submitted" ||
    (status === "streaming" && (!lastMessage || lastMessage.role === "user"));

  // Persist scope changes. Existing thread → server action; new
  // thread → keep in state/ref, it ships with the first message.
  function handleSelectionChange(ids: string[]) {
    setSelectedDocIds(ids);
    selectedIdsRef.current = ids;
    const tid = threadIdRef.current;
    if (tid) {
      startSaveScope(async () => {
        await updateThreadSelectedDocsAction({ threadId: tid, docIds: ids });
      });
    }
  }

  function changePreviewDoc(docId: string) {
    setPreviewDocId(docId || null);
  }

  // Sync the collapsible preview panel with previewOpen state.
  useEffect(() => {
    const panel = previewPanelRef.current;
    if (!panel) return;
    if (previewOpen && panel.isCollapsed()) panel.expand();
    if (!previewOpen && !panel.isCollapsed()) panel.collapse();
  }, [previewOpen]);

  // Post-stream: a fresh thread's id arrives in a data-thread part.
  useEffect(() => {
    if (threadId) return;
    if (isBusy) return;
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of m.parts ?? []) {
        if (part.type === "data-thread") {
          const newId = (part as { data?: { thread_id?: string } }).data
            ?.thread_id;
          if (newId && newId !== threadIdRef.current) {
            threadIdRef.current = newId;
            router.replace(`/chat/${newId}`);
            router.refresh();
            return;
          }
        }
      }
    }
  }, [messages, threadId, isBusy, router]);

  // Auto-scroll conversation on new messages / streaming token.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isBusy]);

  // Auto-resize the textarea up to ~6 lines.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isBusy || !hasCompletedDocs) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Slim header: title + preview toggle */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <span className="text-sm font-medium">Chat</span>
        <Button
          type="button"
          variant={previewOpen ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setPreviewOpen((o) => !o)}
          className="gap-1.5 text-xs"
        >
          <PanelRight className="h-3.5 w-3.5" />
          Preview
        </Button>
      </header>

      <div className="min-h-0 flex-1">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Conversation + composer */}
          <ResizablePanel
            defaultSize={62}
            minSize={35}
            className="flex min-w-0 flex-col"
          >
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-6 sm:px-8"
            >
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.length === 0 ? (
                  <EmptyChatPrompt hasCompletedDocs={hasCompletedDocs} />
                ) : (
                  messages.map((m, i) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isStreaming={
                        status === "streaming" && i === messages.length - 1
                      }
                      onShowChunk={setActiveChunk}
                    />
                  ))
                )}

                {isAwaitingFirstToken && <ThinkingBubble />}

                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {error.message}
                  </div>
                )}
              </div>
            </div>

            {/* Composer */}
            <div className="border-t bg-background px-4 py-3 sm:px-8">
              <div className="mx-auto flex max-w-3xl flex-col gap-2">
                {!hasCompletedDocs && (
                  <div className="flex items-start gap-2 rounded-md border bg-muted px-3 py-2 text-xs text-muted-foreground">
                    <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Upload some documents before chatting.{" "}
                      <Link
                        href="/docs"
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        Go to Documents →
                      </Link>
                    </span>
                  </div>
                )}

                <div className="relative flex items-end gap-2 rounded-lg border bg-background p-2 focus-within:border-foreground/40">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      hasCompletedDocs
                        ? "Ask a question about your documents…"
                        : "Upload documents first…"
                    }
                    rows={1}
                    disabled={!hasCompletedDocs || isBusy}
                    className="min-h-[40px] flex-1 resize-none border-0 bg-transparent p-2 text-sm focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <DocSelector
                    docs={completedDocs}
                    selectedIds={selectedDocIds}
                    onChange={handleSelectionChange}
                    disabled={isBusy}
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || isBusy || !hasCompletedDocs}
                    className="h-9 w-9 shrink-0"
                    aria-label="Send"
                  >
                    {isBusy ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-center text-[10px] text-muted-foreground">
                  Press{" "}
                  <kbd className="rounded bg-muted px-1 py-0.5">Enter</kbd> to
                  send,{" "}
                  <kbd className="rounded bg-muted px-1 py-0.5">
                    Shift + Enter
                  </kbd>{" "}
                  for a new line
                </p>
              </div>
            </div>
          </ResizablePanel>

          {/* Handle — inert/invisible while preview is collapsed */}
          <ResizableHandle
            withHandle
            className={cn(!previewOpen && "pointer-events-none opacity-0")}
          />

          {/* Preview pane (collapsible) */}
          <ResizablePanel
            ref={previewPanelRef}
            collapsible
            collapsedSize={0}
            defaultSize={0}
            minSize={26}
            maxSize={60}
            onExpand={() => setPreviewOpen(true)}
            onCollapse={() => setPreviewOpen(false)}
            className="min-w-0"
          >
            <PreviewPane
              docs={completedDocs}
              activeDocId={previewDocId}
              onActiveDocChange={changePreviewDoc}
              onClose={() => setPreviewOpen(false)}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <ChunkModal chunk={activeChunk} onClose={() => setActiveChunk(null)} />
    </div>
  );
}

// Animated three-dot bubble shown while awaiting the first token.
function ThinkingBubble() {
  return (
    <div className="flex w-full justify-start">
      <div
        role="status"
        aria-label="Assistant is thinking"
        className="flex max-w-[85%] items-center gap-1.5 rounded-lg bg-muted px-4 py-4"
      >
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" />
      </div>
    </div>
  );
}

function EmptyChatPrompt({ hasCompletedDocs }: { hasCompletedDocs: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <h2 className="text-xl font-semibold">RAG Chatbot</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {hasCompletedDocs
          ? "Ask anything about the documents you've uploaded."
          : "Head over to Documents and upload your first file to get started."}
      </p>
    </div>
  );
}
