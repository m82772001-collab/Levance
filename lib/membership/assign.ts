import "server-only";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import type { MembershipTier, MembershipStatus } from "./types";

/**
 * Ensures a user has an active COMMON membership row.
 * Safe to call repeatedly (upsert on user_id).
 * Uses the service-role client because authenticated users have no
 * insert policy on user_memberships (prevents self-elevation).
 */
export async function ensureCommonMembership(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("user_memberships")
    .select("id, tier, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return;
  }

  const { error } = await admin.from("user_memberships").insert({
    user_id: userId,
    tier: "COMMON",
    status: "active",
  });

  if (error) {
    // Table may not exist yet during migration rollout; log and continue.
    console.error("ensureCommonMembership failed:", error.message);
    return;
  }

  await admin.from("membership_history").insert({
    user_id: userId,
    from_tier: null,
    to_tier: "COMMON",
    from_status: null,
    to_status: "active",
    reason: "initial_signup",
    actor_id: userId,
  });
}

/**
 * Server-only membership change. Records history.
 * Never call this from client-controlled input without strict authorization.
 */
export async function setUserMembership(params: {
  userId: string;
  tier: MembershipTier;
  status?: MembershipStatus;
  actorId?: string | null;
  reason?: string;
  invitationId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: current } = await admin
    .from("user_memberships")
    .select("*")
    .eq("user_id", params.userId)
    .maybeSingle();

  const status = params.status ?? "active";

  if (current) {
    const { error } = await admin
      .from("user_memberships")
      .update({
        tier: params.tier,
        status,
        invitation_id: params.invitationId ?? current.invitation_id,
        stripe_customer_id:
          params.stripeCustomerId ?? current.stripe_customer_id,
        stripe_subscription_id:
          params.stripeSubscriptionId ?? current.stripe_subscription_id,
        subscription_status:
          params.subscriptionStatus ?? current.subscription_status,
        current_period_start:
          params.currentPeriodStart ?? current.current_period_start,
        current_period_end:
          params.currentPeriodEnd ?? current.current_period_end,
        cancel_at_period_end:
          params.cancelAtPeriodEnd ?? current.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", params.userId);

    if (error) throw error;
  } else {
    const { error } = await admin.from("user_memberships").insert({
      user_id: params.userId,
      tier: params.tier,
      status,
      invitation_id: params.invitationId ?? null,
      stripe_customer_id: params.stripeCustomerId ?? null,
      stripe_subscription_id: params.stripeSubscriptionId ?? null,
      subscription_status: params.subscriptionStatus ?? null,
      current_period_start: params.currentPeriodStart ?? null,
      current_period_end: params.currentPeriodEnd ?? null,
      cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
    });
    if (error) throw error;
  }

  await admin.from("membership_history").insert({
    user_id: params.userId,
    from_tier: current?.tier ?? null,
    to_tier: params.tier,
    from_status: current?.status ?? null,
    to_status: status,
    reason: params.reason ?? "admin_or_system",
    actor_id: params.actorId ?? null,
  });
}
