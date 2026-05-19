import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ------------------------------------------------------------
// Server-side helpers for reading the current Supabase user.
// Use `requireUser()` in any Server Component, Server Action,
// or Route Handler that should be auth-gated. The middleware
// already redirects unauthenticated page visits to /login, so
// this is mostly belt-and-suspenders for API routes.
// ------------------------------------------------------------

// Returns the current user or null. Doesn't throw.
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Returns the current user or redirects to /login.
// Use in page Server Components.
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
