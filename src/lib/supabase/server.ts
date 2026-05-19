import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// ------------------------------------------------------------
// Server-side Supabase client for Server Components, Route
// Handlers, and Server Actions. Reads + writes auth cookies so
// the user's session is kept in sync.
//
// RLS-enforced — uses the publishable key. Anything that needs
// to bypass RLS (e.g. the cron worker) must use createSecretClient.
// ------------------------------------------------------------
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookie writes aren't allowed there.
            // Safe to ignore as long as middleware also refreshes sessions.
          }
        },
      },
    },
  );
}

// ------------------------------------------------------------
// Elevated, RLS-bypassing client. Server-only — never expose to
// the browser. Used by the cron worker to claim queued docs and
// upsert into tables on behalf of the owning user.
// ------------------------------------------------------------
export function createSecretClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not set");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
