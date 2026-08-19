"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/google-button";

const initial: AuthActionState = {};

export function LoginForm({ redirectTo, oauthError }: { redirectTo?: string; oauthError?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const error = state.error ?? (oauthError === "oauth_failed" ? "Google sign-in could not be completed. Please try again." : undefined);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div className="text-center">
        <p className="eyebrow mb-3">Welcome back</p>
        <h1 className="font-display text-3xl tracking-tight">Sign in</h1>
      </div>

      {error && <div role="alert" className="rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}

      <GoogleButton next={redirectTo ?? "/account"} />
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-neutral-400"><span className="h-px flex-1 bg-neutral-200" />or<span className="h-px flex-1 bg-neutral-200" /></div>

      <input type="hidden" name="redirectTo" value={redirectTo ?? "/account"} />

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="w-full rounded border border-neutral-300 bg-white px-4 py-3 text-sm text-obsidian placeholder:text-neutral-400 focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne" placeholder="you@example.com" />
        {state.fieldErrors?.email && <p className="text-xs text-danger">{state.fieldErrors.email[0]}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between"><label htmlFor="password" className="block text-sm font-medium text-neutral-700">Password</label><Link href="/forgot-password" className="text-xs text-neutral-500 hover:text-obsidian transition-colors">Forgot password?</Link></div>
        <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} className="w-full rounded border border-neutral-300 bg-white px-4 py-3 text-sm text-obsidian placeholder:text-neutral-400 focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne" placeholder="••••••••" />
        {state.fieldErrors?.password && <p className="text-xs text-danger">{state.fieldErrors.password[0]}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      <p className="text-center text-sm text-neutral-600">New to LÉVANCE? <Link href="/signup" className="font-medium text-obsidian underline-offset-4 hover:underline">Create an account</Link></p>
    </form>
  );
}
