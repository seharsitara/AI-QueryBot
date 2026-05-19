import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Edge proxy — runs before every page/API request. Refreshes Supabase
// auth cookies and redirects unauthenticated visitors away from
// dashboard routes (and vice versa).
//
// Next.js 16 renamed `middleware.ts` → `proxy.ts` and the exported
// function from `middleware` → `proxy`.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Matcher excludes static assets, image optimisation, and favicons —
// they don't need auth gating and skipping them keeps the proxy fast.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
