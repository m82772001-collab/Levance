"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type AuthActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

const initial: AuthActionState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initial);

  if (state.success) {
    return (
      <div className="space-y-6 text-center">
        <p className="eyebrow mb-3">Password updated</p>
        <h1 className="font-display text-3xl tracking-tight">Success</h1>
        <p className="text-sm text-neutral-600">{state.success}</p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-obsidian underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="text-center">
        <p className="eyebrow mb-3">Account recovery</p>
        <h1 className="font-display text-3xl tracking-tight">Set new password</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Choose a strong password of at least 8 characters.
        </p>
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded border border-neutral-300 bg-white px-4 py-3 text-sm text-obsidian focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne"
        />
        {state.fieldErrors?.password && (
          <p className="text-xs text-danger">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded border border-neutral-300 bg-white px-4 py-3 text-sm text-obsidian focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne"
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="text-xs text-danger">{state.fieldErrors.confirmPassword[0]}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
