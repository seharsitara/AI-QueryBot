// ------------------------------------------------------------
// Dashboard left sidebar. Server component — fetches threads
// with the RLS-scoped Supabase client and hands them off to a
// client subcomponent that handles active-state highlighting
// and the delete-confirmation dialog.
// ------------------------------------------------------------

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listThreadsForUser } from "@/repositories/threads";
import { SidebarNav } from "./sidebar-nav";
import { ThreadsList } from "./threads-list";
import { UserMenu } from "./user-menu";

interface AppSidebarProps {
  userEmail: string;
}

export async function AppSidebar({ userEmail }: AppSidebarProps) {
  const threads = await listThreadsForUser();

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r bg-muted/20 lg:flex">
      {/* Brand + New chat (outline so it reads as an action, not the
          currently-selected page — that's what SidebarNav shows) */}
      <div className="flex flex-col gap-3 p-3">
        <Link href="/chat" className="px-2 text-sm font-semibold text-[#0f2d52]">
          QueryBot
        </Link>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Link href="/chat">
            <Plus className="h-3.5 w-3.5" />
            New chat
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          className="w-full justify-start gap-2 bg-[#0f2d52] hover:bg-[#0c2442]"
        >
          <Link href="/chat/multi">
            <Plus className="h-3.5 w-3.5" />
            Multi-doc chat
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Primary nav (Chat / Documents) with active highlight */}
      <div className="py-2">
        <SidebarNav />
      </div>

      <Separator />

      {/* Threads (Bookmarked + Recent sections rendered inside) —
          fills the remaining vertical space */}
      <div className="flex min-h-0 flex-1 flex-col pt-2">
        <div className="min-h-0 flex-1">
          <ThreadsList threads={threads} />
        </div>
      </div>

      <Separator />

      {/* User footer */}
      <div className="p-2">
        <UserMenu email={userEmail} />
      </div>
    </aside>
  );
}
