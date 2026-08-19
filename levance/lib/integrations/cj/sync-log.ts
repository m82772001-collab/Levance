import "server-only";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";

export async function writeCjSyncLog(entry: {
  sync_type: string;
  status: "success" | "error" | "partial";
  message?: string;
  metadata?: Record<string, unknown>;
  target_id?: string;
}) {
  try {
    const admin = createSupabaseAdminClient();
    const safe = { ...(entry.metadata ?? {}) };
    delete safe.apiKey;
    delete safe.accessToken;
    delete safe.refreshToken;
    delete safe.token;

    await admin.from("cj_sync_logs").insert({
      sync_type: entry.sync_type,
      status: entry.status,
      message: entry.message?.slice(0, 2000) ?? null,
      target_id: entry.target_id ?? null,
      metadata: safe,
      created_at: new Date().toISOString(),
    });
  } catch {
    // non-fatal
  }
}
