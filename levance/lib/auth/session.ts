import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import type { UserRole } from "@/lib/db/types";
import type { MembershipTier } from "@/lib/membership/types";

export interface SessionUser {
  id: string;
  email: string | null;
  role: UserRole;
  membershipTier: MembershipTier;
}

/**
 * Resolves the current signed-in user, their role from `profiles`, and
 * their membership tier from `user_memberships`, server-side, on every call.
 * Returns null when unauthenticated.
 *
 * Role and membership are re-fetched from the database rather than
 * trusting JWT claims that could go stale.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let membershipTier: MembershipTier = "COMMON";
  try {
    const { data: membership } = await supabase
      .from("user_memberships")
      .select("tier, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership && (membership as { status: string }).status === "active") {
      membershipTier = (membership as { tier: MembershipTier }).tier;
    }
  } catch {
    // Membership tables may not be applied yet; default COMMON.
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: profile?.role ?? "customer",
    membershipTier,
  };
}
