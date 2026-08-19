import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./session";

/**
 * Server-side authorization guard for admin-only routes/actions.
 *
 * Per the security model, admin access is enforced here AND by RLS
 * policies on every admin-touched table (see
 * supabase/migrations/0002_profiles_rbac.sql) — never by hiding links
 * in the frontend. Call this at the top of admin layouts, route
 * handlers, and server actions that mutate admin-only data.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirectTo=/admin");
  }

  if (user.role !== "admin") {
    redirect("/");
  }

  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * MONARCH_INVITE capability.
 * In Phase 2 this is granted to admin-role accounts (founder operates
 * as admin). Call this before creating/revoking Monarch invitations
 * or granting/revoking Monarch membership. Never trust the client.
 */
export async function requireMonarchInvite(): Promise<SessionUser> {
  const user = await requireAdmin();
  // Future: finer-grained capability table. For now admin === founder capability.
  return user;
}
