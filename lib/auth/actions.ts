"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { claimGuestCart } from "@/lib/cart/service";
import { assertAuthRateLimit } from "@/lib/security/auth-rate-limit";
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

const INVALID_CREDENTIALS = "Invalid email or password.";
const GENERIC_SIGNUP_ERROR = "We couldn't create your account. Please check your details and try again.";
const RATE_LIMITED = "Too many sign-in attempts. Please try again later.";

export async function loginAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const raw = { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { error: INVALID_CREDENTIALS, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  if (!(await assertAuthRateLimit(parsed.data.email))) return { error: RATE_LIMITED };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return { error: INVALID_CREDENTIALS };

  try { await claimGuestCart(data.user.id); } catch { /* preserve successful authentication */ }

  const redirectTo = String(formData.get("redirectTo") ?? "/account");
  const safeRedirect = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/account";
  redirect(safeRedirect);
}

export async function signupAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const raw = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    acceptedTerms: formData.get("acceptedTerms") === "on" || formData.get("acceptedTerms") === "true",
  };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  if (!(await assertAuthRateLimit(parsed.data.email))) return { error: RATE_LIMITED };

  const supabase = await createSupabaseServerClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName }, emailRedirectTo: `${origin}/auth/callback?next=/account` },
  });

  if (error || !data.user) return { error: GENERIC_SIGNUP_ERROR };
  try { const { ensureCommonMembership } = await import("@/lib/membership/assign"); await ensureCommonMembership(data.user.id); } catch { /* retry on authenticated access */ }
  try { await claimGuestCart(data.user.id); } catch { /* preserve successful account creation */ }

  if (!data.session) return { success: "Account created. Please check your email to verify your address before signing in." };
  redirect("/account");
}

export async function forgotPasswordAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: String(formData.get("email") ?? "") });
  if (!parsed.success) return { error: "Please enter a valid email address." };
  const supabase = await createSupabaseServerClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${origin}/reset-password` });
  return { success: "If an account exists for that email, you will receive a password reset link shortly." };
}

export async function resetPasswordAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({ password: String(formData.get("password") ?? ""), confirmPassword: String(formData.get("confirmPassword") ?? "") });
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "We couldn't update your password. Please request a new reset link." };
  return { success: "Your password has been updated. You can now sign in." };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
