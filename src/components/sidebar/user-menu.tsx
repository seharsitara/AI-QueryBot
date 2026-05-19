"use client";

// ------------------------------------------------------------
// Sidebar footer: avatar + email + dropdown with Sign out.
// The signOut server action is imported from (auth)/actions and
// invoked via a hidden <form> inside the dropdown item.
// ------------------------------------------------------------

import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  email: string;
}

export function UserMenu({ email }: UserMenuProps) {
  // First letter of email → avatar fallback (no images stored).
  const initial = email.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {email}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          {/* The dropdown closes on click, so we wrap the action in a
              form whose submit handler triggers the server action. */}
          <form action={signOut} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
