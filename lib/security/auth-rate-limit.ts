import "server-only";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";

const LIMIT = 5;
const WINDOW_SECONDS = 15 * 60;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function assertAuthRateLimit(email: string): Promise<boolean> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  const key = `auth:${ip}:${normalizeEmail(email)}`;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_auth_rate_limit", {
    p_key: key,
    p_limit: LIMIT,
    p_window_seconds: WINDOW_SECONDS,
  } as never);

  if (error) {
    // Fail closed for authentication abuse controls: if the limiter cannot
    // be consulted, do not permit an unlimited password-guessing path.
    return false;
  }

  return data === true;
}
