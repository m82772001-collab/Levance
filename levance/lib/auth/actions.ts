"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

export type AuthActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Email/password sign-in. Session is established via Supabase SSR cookies.
 */
export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please check your email and password.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  const redirectTo = String(formData.get("redirectTo") ?? "/account");
  // Only allow relative paths to prevent open redirects.
  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/account";

  redirect(safeRedirect);
}

/**
 * Registration. Profile row is created by the existing DB trigger.
 * Membership is assigned to COMMON by the membership helper (Phase 2C).
 * The client is never allowed to choose a paid or Monarch tier here.
 */
export async function signupAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    acceptedTerms: formData.get("acceptedTerms") === "on" || formData.get("acceptedTerms") === "true",
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createSupabaseServerClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
      emailRedirectTo: `${origin}/login`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Assign COMMON membership once the user exists.
  // The helper is a no-op / safe until the membership migration is applied.
  if (data.user) {
    try {
      const { ensureCommonMembership } = await import("@/lib/membership/assign");
      await ensureCommonMembership(data.user.id);
    } catch {
      // Membership tables may not exist yet during early Phase 2;
      // profile trigger still ran. Membership assignment is re-tried
      // on first authenticated page load if needed.
    }
  }

  // If email confirmation is required, Supabase returns no session.
  if (!data.session) {
    return {
      success:
        "Account created. Please check your email to verify your address before signing in.",
    };
  }

  redirect("/account");
}

/**
 * Request a password-reset email. Always returns a generic success message
 * to avoid email enumeration.
 */
export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = { email: String(formData.get("email") ?? "") };
  const parsed = forgotPasswordSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: "Please enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createSupabaseServerClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`,
  });

  return {
    success:
      "If an account exists for that email, you will receive a password reset link shortly.",
  };
}

/**
 * Set a new password after the user clicks the reset link.
 * Supabase places a recovery session in the cookies via the middleware.
 */
export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Your password has been updated. You can now sign in.",
  };
}

/**
 * Sign out the current user and clear the session cookie.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
