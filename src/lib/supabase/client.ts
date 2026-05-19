import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for browser/client components.
 * Uses the publishable key which is safe to expose.
 */
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
