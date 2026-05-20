"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

export function AuthNav() {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isSignup = pathname === "/signup";

  return (
    <header className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center justify-between px-3 sm:px-4 lg:px-5">
        <Link href="/login" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f2d52]">
            <Search className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0f2d52]">
            QueryBot
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isLogin
                ? "border border-slate-200 bg-white text-[#0f2d52]"
                : "text-[#0f2d52] hover:text-[#0c2442]"
            )}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors",
              isSignup
                ? "bg-[#0f2d52] text-white"
                : "bg-[#0f2d52] text-white hover:bg-[#0c2442]"
            )}
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
