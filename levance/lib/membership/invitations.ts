import "server-only";
import { createHash, randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { setUserMembership } from "./assign";
import type { InvitationStatus } from "./types";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Create a Monarch invitation. Returns the raw token ONCE for delivery.
 * Only the hash is stored. Caller must be authorized (founder/admin with
 * MONARCH_INVITE capability — enforced by the calling server action).
 */
export async function createMonarchInvitation(params: {
  createdBy: string;
  email?: string | null;
  expiresInDays?: number;
}): Promise<{ id: string; token: string; expiresAt: string }> {
  const admin = createSupabaseAdminClient();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + (params.expiresInDays ?? 14) * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("membership_invitations")
    .insert({
      token_hash: tokenHash,
      email: params.email?.toLowerCase().trim() || null,
      tier: "MONARCH",
      status: "pending",
      created_by: params.createdBy,
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create invitation");
  }

  return {
    id: data.id as string,
    token: rawToken,
    expiresAt: data.expires_at as string,
  };
}

export async function revokeMonarchInvitation(params: {
  invitationId: string;
  revokedBy: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("membership_invitations")
    .update({
      status: "revoked" as InvitationStatus,
      revoked_at: new Date().toISOString(),
      revoked_by: params.revokedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.invitationId)
    .eq("status", "pending");

  if (error) throw error;
}

/**
 * Accept a Monarch invitation. Validates token hash, expiry, email
 * restriction, and marks invitation used. Elevates membership to MONARCH.
 */
export async function acceptMonarchInvitation(params: {
  rawToken: string;
  userId: string;
  userEmail: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();
  const tokenHash = hashToken(params.rawToken);

  const { data: inv, error } = await admin
    .from("membership_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !inv) {
    return { ok: false, error: "Invalid or unknown invitation." };
  }

  if (inv.status !== "pending") {
    return { ok: false, error: "This invitation is no longer valid." };
  }

  if (new Date(inv.expires_at as string) < new Date()) {
    await admin
      .from("membership_invitations")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", inv.id);
    return { ok: false, error: "This invitation has expired." };
  }

  if (inv.email) {
    const restricted = (inv.email as string).toLowerCase();
    const actual = (params.userEmail ?? "").toLowerCase();
    if (restricted !== actual) {
      return {
        ok: false,
        error: "This invitation is restricted to a different email address.",
      };
    }
  }

  // Mark used first (optimistic concurrency via status check)
  const { data: updated, error: updateError } = await admin
    .from("membership_invitations")
    .update({
      status: "accepted",
      used_at: new Date().toISOString(),
      used_by: params.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inv.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return { ok: false, error: "Invitation could not be claimed." };
  }

  await setUserMembership({
    userId: params.userId,
    tier: "MONARCH",
    status: "active",
    actorId: params.userId,
    reason: "monarch_invitation_accepted",
    invitationId: inv.id as string,
  });

  return { ok: true };
}

export async function listMonarchInvitations(limit = 50) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("membership_invitations")
    .select(
      "id, email, status, expires_at, used_at, created_at, created_by, used_by, revoked_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
