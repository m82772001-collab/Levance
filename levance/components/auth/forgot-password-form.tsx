"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type AuthActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

const initial: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initial);

  if (state.success) {
    return (
      <div className="space-y-6 text-center">
        <p className="eyebrow mb-3">Email sent</p>
        <h1 className="font-display text-3xl tracking-tight">Check your inbox</h1>
        <p className="text-sm text-neutral-600">{state.success}</p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-obsidian underline-offset-4 hover:underline"
        >
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="text-center">
        <p className="eyebrow mb-3">Account recovery</p>
        <h1 className="font-display text-3xl tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Enter the email associated with your account and we will send a reset link.
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
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded border border-neutral-300 bg-white px-4 py-3 text-sm text-obsidian focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne"
          placeholder="you@example.com"
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-neutral-600">
        <Link href="/login" className="font-medium text-obsidian underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
