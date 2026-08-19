"use client";

import { useActionState } from "react";
import { updateProfileAction, type AccountActionState } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";

export function ProfileForm({
  email,
  fullName,
}: {
  email: string;
  fullName: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    {} as AccountActionState
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p role="alert" className="text-sm text-danger">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-success">{state.success}</p>
      )}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full rounded border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500"
        />
        <p className="mt-1 text-xs text-neutral-500">Email is managed via authentication.</p>
      </div>
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700 mb-1">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          defaultValue={fullName}
          required
          maxLength={120}
          className="w-full rounded border border-neutral-300 px-4 py-3 text-sm focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
