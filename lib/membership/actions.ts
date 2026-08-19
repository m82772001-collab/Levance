"use server";

import { requireUser, requireMonarchInvite } from "@/lib/auth/rbac";
import {
  acceptMonarchInvitation,
  createMonarchInvitation,
  revokeMonarchInvitation,
} from "./invitations";
import { setUserMembership } from "./assign";
import type { MembershipTier } from "./types";

export async function acceptInvitationAction(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "");

  if (!token) {
    return { error: "Missing invitation token." };
  }

  const result = await acceptMonarchInvitation({
    rawToken: token,
    userId: user.id,
    userEmail: user.email,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: "Welcome to Monarch. Your membership is now active." };
}

export async function createInvitationAction(
  _prev: { error?: string; success?: string; inviteUrl?: string },
  formData: FormData
): Promise<{ error?: string; success?: string; inviteUrl?: string }> {
  const admin = await requireMonarchInvite();
  const email = String(formData.get("email") ?? "").trim() || null;
  const days = Number(formData.get("expiresInDays") ?? 14);

  try {
    const inv = await createMonarchInvitation({
      createdBy: admin.id,
      email,
      expiresInDays: Number.isFinite(days) ? days : 14,
    });

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";
    const inviteUrl = `${origin}/invite/${inv.token}`;

    return {
      success: "Invitation created. Share the link securely — it is shown only once.",
      inviteUrl,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create invitation" };
  }
}

export async function revokeInvitationAction(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const admin = await requireMonarchInvite();
  const id = String(formData.get("invitationId") ?? "");
  if (!id) return { error: "Missing invitation id" };

  try {
    await revokeMonarchInvitation({ invitationId: id, revokedBy: admin.id });
    return { success: "Invitation revoked." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to revoke" };
  }
}

/**
 * Admin grant/revoke of membership (including Monarch).
 * Must never be callable without requireMonarchInvite / requireAdmin.
 */
export async function adminSetMembershipAction(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const admin = await requireMonarchInvite();
  const userId = String(formData.get("userId") ?? "");
  const tier = String(formData.get("tier") ?? "") as MembershipTier;
  const reason = String(formData.get("reason") ?? "admin_adjustment");

  if (!userId || !["COMMON", "PRO", "PREMIUM", "MONARCH"].includes(tier)) {
    return { error: "Invalid user or tier." };
  }

  try {
    await setUserMembership({
      userId,
      tier,
      status: "active",
      actorId: admin.id,
      reason,
    });
    return { success: `Membership set to ${tier}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update membership" };
  }
}
