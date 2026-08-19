import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { hasMembership, tierAtLeast } from "@/lib/membership/benefits";
import type { MembershipTier } from "@/lib/membership/types";

/**
 * PREMIUM or MONARCH required for Private AI Showroom.
 * Server-side only — never trust hidden links.
 */
export async function requireShowroomAccess(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirectTo=/showroom");
  }
  if (!tierAtLeast(user.membershipTier, "PREMIUM")) {
    redirect("/membership");
  }
  return user;
}

/**
 * MONARCH only for Private Salon.
 */
export async function requireMonarchAccess(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirectTo=/monarch");
  }
  if (user.membershipTier !== "MONARCH") {
    redirect("/");
  }
  return user;
}

export async function canAccessShowroom(tier?: MembershipTier): Promise<boolean> {
  if (tier) return tierAtLeast(tier, "PREMIUM");
  return hasMembership("PREMIUM");
}

export async function canAccessMonarch(tier?: MembershipTier): Promise<boolean> {
  if (tier) return tier === "MONARCH";
  const user = await getCurrentUser();
  return user?.membershipTier === "MONARCH";
}
