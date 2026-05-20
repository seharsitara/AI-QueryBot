import Link from "next/link";
import { Search } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { LandingUserMenu } from "./landing-user-menu";

export function LandingHeader({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center justify-between px-3 sm:px-4 lg:px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f2d52]">
            <Search className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0f2d52]">
            QueryBot
          </span>
        </Link>

        {user ? (
          <LandingUserMenu user={user} />
        ) : (
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#0f2d52] transition-colors hover:bg-slate-50"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#0f2d52] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0c2442]"
            >
              Register
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
