"use client";

import { useActionState } from "react";
import { createInvitationAction } from "@/lib/membership/actions";
import { Button } from "@/components/ui/button";

type State = { error?: string; success?: string; inviteUrl?: string };

export function CreateInvitationForm() {
  const [state, formAction, pending] = useActionState(
    createInvitationAction,
    {} as State
  );

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.success && (
        <div className="rounded border border-success/30 bg-success/5 px-4 py-3 text-sm">
          <p className="text-success font-medium">{state.success}</p>
          {state.inviteUrl && (
            <p className="mt-2 break-all font-mono text-xs text-neutral-700">
              {state.inviteUrl}
            </p>
          )}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
          Restrict to email (optional)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="guest@example.com"
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne"
        />
      </div>
      <div>
        <label htmlFor="expiresInDays" className="block text-sm font-medium text-neutral-700 mb-1">
          Expires in (days)
        </label>
        <input
          id="expiresInDays"
          name="expiresInDays"
          type="number"
          min={1}
          max={90}
          defaultValue={14}
          className="w-32 rounded border border-neutral-300 px-3 py-2 text-sm focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create Monarch invitation"}
      </Button>
    </form>
  );
}
