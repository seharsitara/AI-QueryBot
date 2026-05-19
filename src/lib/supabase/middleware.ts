import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Routes that authenticated users should never see (login/signup).
// Hitting them while signed in bounces to /chat.
const AUTH_ONLY_ROUTES = ["/login", "/signup"];

// Routes that don't require a Supabase session. Anything else is
// auth-gated. /api/cron lives here because it carries its own shared
// secret in the `x-cron-secret` header.
const PUBLIC_ROUTES = ["/"];
const PUBLIC_PREFIXES = ["/login", "/signup", "/auth", "/api/cron"];

/**
 * Refreshes the Supabase session cookie on every request AND gates
 * the dashboard routes: unauthenticated visitors are redirected to
 * /login, and signed-in users who hit /login or /signup are sent
 * onward to /chat.
 *
 * Per the @supabase/ssr docs: do not run any other code between
 * `createServerClient(...)` and `supabase.auth.getUser()`.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touch the session so cookies get refreshed if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  // Logged out + protected route → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Logged in + auth-only route → /chat
  if (user && AUTH_ONLY_ROUTES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
