import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserMembership, getBenefitsForTier } from "./queries";
import type { MembershipTier } from "./types";

/**
 * Server-side membership benefit checking.
 * Prefer these helpers over hard-coding tier comparisons in UI.
 */

const TIER_RANK: Record<MembershipTier, number> = {
  COMMON: 1,
  PRO: 2,
  PREMIUM: 3,
  MONARCH: 4,
};

export async function hasMembership(
  minTier: MembershipTier,
  userId?: string
): Promise<boolean> {
  let tier: MembershipTier = "COMMON";

  if (userId) {
    const m = await getUserMembership(userId);
    if (m?.status === "active") tier = m.tier;
  } else {
    const user = await getCurrentUser();
    if (!user) return minTier === "COMMON";
    tier = user.membershipTier;
  }

  return TIER_RANK[tier] >= TIER_RANK[minTier];
}

export async function hasBenefit(
  benefitKey: string,
  userId?: string
): Promise<boolean> {
  let tier: MembershipTier = "COMMON";
  let uid = userId;

  if (!uid) {
    const user = await getCurrentUser();
    if (!user) {
      // Unauthenticated: only COMMON benefits that are universal
      const benefits = await getBenefitsForTier("COMMON").catch(() => []);
      return benefits.some((b) => b.key === benefitKey);
    }
    uid = user.id;
    tier = user.membershipTier;
  } else {
    const m = await getUserMembership(uid);
    if (m?.status === "active") tier = m.tier;
  }

  const benefits = await getBenefitsForTier(tier).catch(() => []);
  return benefits.some((b) => b.key === benefitKey);
}

export async function canAccess(
  resource: "early_access" | "member_price" | "exclusive" | "priority" | "invite_only",
  userId?: string
): Promise<boolean> {
  return hasBenefit(resource, userId);
}

export function tierAtLeast(
  userTier: MembershipTier,
  required: MembershipTier
): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[required];
}
