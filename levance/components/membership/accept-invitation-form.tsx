"use client";

import { useActionState } from "react";
import { acceptInvitationAction } from "@/lib/membership/actions";
import { Button } from "@/components/ui/button";

type State = { error?: string; success?: string };

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    acceptInvitationAction,
    {} as State
  );

  if (state.success) {
    return (
      <div className="space-y-4">
        <p className="text-champagne text-sm font-medium">{state.success}</p>
        <a
          href="/account"
          className="inline-block rounded bg-champagne px-6 py-3 text-sm font-medium text-obsidian"
        >
          Go to your account
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-champagne text-obsidian hover:bg-champagne-soft"
      >
        {pending ? "Accepting…" : "Accept Monarch invitation"}
      </Button>
    </form>
  );
}
