"use client";

// ------------------------------------------------------------
// Primary sidebar navigation (Chat / Documents) with an active
// highlight driven by usePathname(). Client component for the
// pathname read only.
// ------------------------------------------------------------

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessagesSquare, FileText, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  // Active when the pathname starts with any of these.
  match: string[];
}

const LINKS: NavLink[] = [
  { href: "/chat", label: "Chat", icon: MessagesSquare, match: ["/chat"] },
  {
    href: "/chat/multi",
    label: "Multi-Doc Chat",
    icon: Layers,
    match: ["/chat/multi"],
  },
  { href: "/docs", label: "Documents", icon: FileText, match: ["/docs"] },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {LINKS.map((link) => {
        const isActive = link.match.some((m) => {
          if (m === "/chat") {
            return (
              pathname === "/chat" ||
              (pathname.startsWith("/chat/") && !pathname.startsWith("/chat/multi"))
            );
          }
          return pathname === m || pathname.startsWith(`${m}/`);
        });
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              isActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
