import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Server-side Supabase client for use in Server Components, Route
 * Handlers and Server Actions. Uses the ANON key + the caller's
 * session cookie, so every query is subject to RLS as that user.
 *
 * Never use this client to bypass RLS. For privileged operations
 * (webhooks, admin sync jobs) use supabase-admin.ts instead, and only
 * on the server.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no request/response
            // pair to write to — safe to ignore when middleware also
            // refreshes the session.
          }
        },
      },
    }
  );
}
