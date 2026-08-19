import "server-only";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import type {
  MembershipBenefit,
  MembershipTier,
  MembershipTierInfo,
  UserMembership,
} from "./types";
import { ensureCommonMembership } from "./assign";

/**
 * Returns the current active membership for a user.
 * Falls back to ensuring COMMON if no row exists.
 */
export async function getUserMembership(
  userId: string
): Promise<UserMembership | null> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("user_memberships")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    return data as unknown as UserMembership;
  }

  // Lazy ensure COMMON for existing users created before membership migration.
  await ensureCommonMembership(userId);

  const { data: retry } = await supabase
    .from("user_memberships")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return (retry as unknown as UserMembership) ?? null;
}

export async function getMembershipTier(): Promise<MembershipTierInfo[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("membership_tiers")
    .select("tier, name, description, is_paid, is_publicly_purchasable, sort_order")
    .order("sort_order", { ascending: true });

  return (data as unknown as MembershipTierInfo[]) ?? [];
}

export async function getBenefitsForTier(
  tier: MembershipTier
): Promise<MembershipBenefit[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("membership_benefits")
    .select("key, label, description, sort_order")
    .eq("tier", tier)
    .order("sort_order", { ascending: true });

  return (data as unknown as MembershipBenefit[]) ?? [];
}

export async function getAllBenefitsGrouped(): Promise<
  Record<MembershipTier, MembershipBenefit[]>
> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("membership_benefits")
    .select("tier, key, label, description, sort_order")
    .order("sort_order", { ascending: true });

  const grouped: Record<string, MembershipBenefit[]> = {
    COMMON: [],
    PRO: [],
    PREMIUM: [],
    MONARCH: [],
  };

  for (const row of data ?? []) {
    const r = row as unknown as MembershipBenefit & { tier: MembershipTier };
    if (!grouped[r.tier]) grouped[r.tier] = [];
    grouped[r.tier].push({
      key: r.key,
      label: r.label,
      description: r.description,
      sort_order: r.sort_order,
    });
  }

  return grouped as Record<MembershipTier, MembershipBenefit[]>;
}

/**
 * Admin-only: list memberships with optional search.
 */
export async function adminListMemberships(opts?: {
  search?: string;
  tier?: MembershipTier;
  limit?: number;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("user_memberships")
    .select("*, profiles:user_id(full_name)")
    .order("updated_at", { ascending: false })
    .limit(opts?.limit ?? 50);

  if (opts?.tier) {
    query = query.eq("tier", opts.tier);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
