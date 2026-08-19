import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY.
 *
 * `server-only` guarantees this module throws a build error if ever
 * imported into client-bundled code. Restrict usage to:
 *   - Stripe / CJ webhook handlers
 *   - Admin sync jobs (CJ product/inventory sync)
 *   - Scheduled/background tasks
 *
 * Never import this in a Server Component that renders based on the
 * requesting user's identity — use supabase-server.ts (RLS-scoped)
 * for anything user-facing.
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Refusing to create an admin client."
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
