import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser-side Supabase client for Client Components. Uses the public
 * ANON key only — RLS still applies to every query.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
