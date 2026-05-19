"use client";

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
import Link from "next/link";
import { Send, FileWarning, MessageSquare, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { MessageBubble } from "./message-bubble";
import { DocSelector } from "./doc-selector";
import { MultiDocPanel } from "./multi-doc-panel";
import { PreviewPane } from "./preview-pane";
import { ChunkModal } from "./chunk-modal";
import { updateThreadSelectedDocsAction } from "@/app/(dashboard)/chat/actions";
import type { Doc } from "@/types/doc";
import type { RetrievedChunkForUi } from "@/types/message";

type ChatVariant = "default" | "multi";

interface ChatWindowProps {
  threadId: string | null;
  initialMessages?: UIMessage[];
  completedDocs: Doc[];
  initialSelectedDocIds: string[];
  variant?: ChatVariant;
}

export function ChatWindow({
  threadId,
  initialMessages,
  completedDocs,
  initialSelectedDocIds,
  variant = "default",
}: ChatWindowProps) {
  const isMulti = variant === "multi";
  const chatBasePath = isMulti ? "/chat/multi" : "/chat";
  const router = useRouter();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    initialSelectedDocIds,
  );
  const selectedIdsRef = useRef<string[]>(initialSelectedDocIds);
  const [, startSaveScope] = useTransition();

  const hasCompletedDocs = completedDocs.length > 0;
  const hasScopedDocs = !isMulti || selectedDocIds.length > 0;
  const canSend = hasCompletedDocs && hasScopedDocs;

  const previewDocs = useMemo(() => {
    if (!isMulti || selectedDocIds.length === 0) return completedDocs;
    const set = new Set(selectedDocIds);
    return completedDocs.filter((d) => set.has(d.id));
  }, [completedDocs, isMulti, selectedDocIds]);

  const [previewDocId, setPreviewDocId] = useState<string | null>(() =>
    previewDocs[0]?.id ?? completedDocs[0]?.id ?? null,
  );

  const [activeChunk, setActiveChunk] = useState<RetrievedChunkForUi | null>(
    null,
  );

  const threadIdRef = useRef<string | null>(threadId);

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

  function handleSelectionChange(ids: string[]) {
    setSelectedDocIds(ids);
    selectedIdsRef.current = ids;
    const tid = threadIdRef.current;
    if (tid) {
      startSaveScope(async () => {
        await updateThreadSelectedDocsAction({ threadId: tid, docIds: ids });
      });
    }
    if (ids.length > 0 && previewDocId && !ids.includes(previewDocId)) {
      setPreviewDocId(ids[0]!);
    }
  }

  function handleSourceOpen(chunk: RetrievedChunkForUi) {
    setPreviewDocId(chunk.doc_id);
    setActiveChunk(chunk);
  }

  useEffect(() => {
    if (previewDocId && previewDocs.some((d) => d.id === previewDocId)) return;
    if (previewDocs.length > 0) setPreviewDocId(previewDocs[0]!.id);
  }, [previewDocs, previewDocId]);

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
            router.replace(`${chatBasePath}/${newId}`);
            router.refresh();
            return;
          }
        }
      }
    }
  }, [messages, threadId, isBusy, router, chatBasePath]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isBusy]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isBusy || !canSend) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const placeholder = !hasCompletedDocs
    ? "Upload documents first..."
    : isMulti && selectedDocIds.length === 0
      ? "Select documents on the left..."
      : "Ask a question about your documents...";

  return (
    <div className="flex h-full flex-col bg-[#f8fafc]">
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {isMulti && (
            <>
              <ResizablePanel
                defaultSize={22}
                minSize={18}
                maxSize={32}
                className="min-w-0"
              >
                <MultiDocPanel
                  docs={completedDocs}
                  selectedIds={selectedDocIds}
                  onChange={handleSelectionChange}
                  disabled={isBusy}
                />
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-slate-200" />
            </>
          )}

          <ResizablePanel
            defaultSize={isMulti ? 40 : 58}
            minSize={32}
            className="flex min-w-0 flex-col"
          >
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f2d52]">
                {isMulti ? (
                  <Layers className="h-4 w-4 text-white" />
                ) : (
                  <MessageSquare className="h-4 w-4 text-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f2d52]">
                  {isMulti ? "Multi-Doc Chat" : "Chat"}
                </p>
                <p className="text-[10px] text-slate-500">
                  {isMulti
                    ? selectedDocIds.length > 0
                      ? `Scoped to ${selectedDocIds.length} document${selectedDocIds.length === 1 ? "" : "s"}`
                      : "Pick documents on the left"
                    : "Ask questions about your documents"}
                </p>
              </div>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto bg-[#f8fafc] px-4 py-6 sm:px-6"
            >
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.length === 0 ? (
                  <EmptyChatPrompt
                    hasCompletedDocs={hasCompletedDocs}
                    isMulti={isMulti}
                    hasSelection={selectedDocIds.length > 0}
                  />
                ) : (
                  messages.map((m, i) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isStreaming={
                        status === "streaming" && i === messages.length - 1
                      }
                      onShowChunk={handleSourceOpen}
                    />
                  ))
                )}

                {isAwaitingFirstToken && <ThinkingBubble />}

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error.message}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-2">
                {!hasCompletedDocs && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Upload some documents before chatting.{" "}
                      <Link
                        href="/docs"
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        Go to Documents
                      </Link>
                    </span>
                  </div>
                )}

                {isMulti && hasCompletedDocs && selectedDocIds.length === 0 && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
                    Select at least one document on the left to send a message.
                  </p>
                )}

                <div className="relative flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2 focus-within:border-[#0f2d52]/40 focus-within:ring-2 focus-within:ring-[#0f2d52]/10">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    rows={1}
                    disabled={!canSend || isBusy}
                    className="min-h-[40px] flex-1 resize-none border-0 bg-transparent p-2 text-sm text-[#0f2d52] placeholder:text-slate-400 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  {!isMulti && (
                    <DocSelector
                      docs={completedDocs}
                      selectedIds={selectedDocIds}
                      onChange={handleSelectionChange}
                      disabled={isBusy}
                    />
                  )}
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || isBusy || !canSend}
                    className="h-9 w-9 shrink-0 bg-[#0f2d52] hover:bg-[#0c2442]"
                    aria-label="Send"
                  >
                    {isBusy ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-center text-[10px] text-slate-400">
                  Enter to send - Shift+Enter for new line
                </p>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-slate-200" />

          <ResizablePanel
            defaultSize={42}
            minSize={28}
            className="min-w-0 bg-white"
          >
            <PreviewPane
              docs={previewDocs}
              activeDocId={previewDocId}
              onActiveDocChange={setPreviewDocId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <ChunkModal chunk={activeChunk} onClose={() => setActiveChunk(null)} />
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex w-full justify-start">
      <div
        role="status"
        aria-label="Assistant is thinking"
        className="flex max-w-[85%] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
      >
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#0f2d52]/60 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#0f2d52]/60 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#0f2d52]/60" />
      </div>
    </div>
  );
}

function EmptyChatPrompt({
  hasCompletedDocs,
  isMulti,
  hasSelection,
}: {
  hasCompletedDocs: boolean;
  isMulti: boolean;
  hasSelection: boolean;
}) {
  const Icon = isMulti ? Layers : MessageSquare;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f2d52]/10">
        <Icon className="h-6 w-6 text-[#0f2d52]" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[#0f2d52]">
        {isMulti ? "Multi-Doc Chat" : "QueryBot Chat"}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {!hasCompletedDocs
          ? "Upload documents first, then start chatting with your knowledge base."
          : isMulti && !hasSelection
            ? "Select one or more documents on the left, then ask questions scoped to those files only."
            : isMulti
              ? "Ask questions across your selected documents. Sources appear under each answer; preview on the right."
              : "Ask anything about your uploaded documents. Sources appear under each answer; preview files on the right."}
      </p>
    </div>
  );
}
