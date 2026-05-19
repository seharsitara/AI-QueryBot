"use server";

// ------------------------------------------------------------
// Server actions for login / signup / logout.
// Validation is intentionally lightweight here — Supabase Auth
// surfaces the real errors (bad password, taken email, etc.).
// We just bounce those messages back to the form via redirect
// search params so the page can render them.
// ------------------------------------------------------------

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

// Encodes an error message into the redirect URL so the page
// can show it without needing client state.
function withError(path: string, message: string) {
  const params = new URLSearchParams({ error: message });
  return `${path}?${params.toString()}`;
}

// --- Sign in ----------------------------------------------------
export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(withError("/login", parsed.error.issues[0]!.message));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect(withError("/login", error.message));
  }

  // Refresh any cached server-rendered pages so they see the new session.
  revalidatePath("/", "layout");
  redirect("/chat");
}

// --- Sign up ----------------------------------------------------
export async function signUp(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(withError("/signup", parsed.error.issues[0]!.message));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    redirect(withError("/signup", error.message));
  }

  // If email confirmation is enabled in Supabase, the user must
  // verify before signing in. We bounce to /login with a flag so
  // the page can show a "check your inbox" notice.
  redirect("/login?signedUp=1");
}

// --- Sign out ---------------------------------------------------
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
