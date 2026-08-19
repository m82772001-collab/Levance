"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type AuthActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/google-button";

const initial: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initial);

  if (state.success) {
    return <div className="space-y-6 text-center"><p className="eyebrow mb-3">Almost there</p><h1 className="font-display text-3xl tracking-tight">Check your email</h1><p className="text-sm text-neutral-600">{state.success}</p><Link href="/login" className="inline-block text-sm font-medium text-obsidian underline-offset-4 hover:underline">Return to sign in</Link></div>;
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="text-center"><p className="eyebrow mb-3">Join LÉVANCE</p><h1 className="font-display text-3xl tracking-tight">Create account</h1><p className="mt-2 text-sm text-neutral-500">You begin with the free COMMON membership.</p></div>
      {state.error && <div role="alert" className="rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</div>}
      <GoogleButton />
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-neutral-400"><span className="h-px flex-1 bg-neutral-200" />or<span className="h-px flex-1 bg-neutral-200" /></div>
      <div className="space-y-2"><label htmlFor="fullName" className="block text-sm font-medium text-neutral-700">Full name</label><input id="fullName" name="fullName" type="text" autoComplete="name" required maxLength={120} className="w-full rounded border border-neutral-300 bg-white px-4 py-3 text-sm text-obsidian focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne" />{state.fieldErrors?.fullName && <p className="text-xs text-danger">{state.fieldErrors.fullName[0]}</p>}</div>
      <div className="space-y-2"><label htmlFor="email" className="block text-sm font-medium text-neutral-700">Email</label><input id="email" name="email" type="email" autoComplete="email" required className="w-full rounded border border-neutral-300 bg-white px-4 py-3 text-sm text-obsidian focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne" />{state.fieldErrors?.email && <p className="text-xs text-danger">{state.fieldErrors.email[0]}</p>}</div>
      <div className="space-y-2"><label htmlFor="password" className="block text-sm font-medium text-neutral-700">Password</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="w-full rounded border border-neutral-300 bg-white px-4 py-3 text-sm text-obsidian focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne" />{state.fieldErrors?.password && <p className="text-xs text-danger">{state.fieldErrors.password[0]}</p>}</div>
      <div className="space-y-2"><label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className="w-full rounded border border-neutral-300 bg-white px-4 py-3 text-sm text-obsidian focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne" />{state.fieldErrors?.confirmPassword && <p className="text-xs text-danger">{state.fieldErrors.confirmPassword[0]}</p>}</div>
      <label className="flex items-start gap-3 text-sm text-neutral-600"><input type="checkbox" name="acceptedTerms" value="true" required className="mt-1 h-4 w-4 rounded border-neutral-300 text-obsidian focus:ring-champagne" /><span>I accept the <Link href="/terms" className="underline underline-offset-2 hover:text-obsidian">terms of service</Link> and <Link href="/privacy" className="underline underline-offset-2 hover:text-obsidian">privacy policy</Link>.</span></label>
      {state.fieldErrors?.acceptedTerms && <p className="text-xs text-danger">{state.fieldErrors.acceptedTerms[0]}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
      <p className="text-center text-sm text-neutral-600">Already have an account? <Link href="/login" className="font-medium text-obsidian underline-offset-4 hover:underline">Sign in</Link></p>
    </form>
  );
}
