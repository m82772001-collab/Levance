"use client";

import { useActionState } from "react";
import { buildCollectionAction, type AiActionState } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";

export function CollectionBuilder() {
  const [state, formAction, pending] = useActionState(
    buildCollectionAction,
    {} as AiActionState
  );

  return (
    <form action={formAction} className="rounded-lg border border-neutral-200 bg-white p-5 space-y-3 max-w-lg">
      <label className="block text-sm font-medium text-neutral-700">
        Build a collection from the catalogue
      </label>
      <input
        name="theme"
        required
        maxLength={200}
        placeholder="e.g. Luxury weekend travel"
        className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne"
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Building…" : "Create collection"}
      </Button>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      {state.success && <p className="text-xs text-success">{state.success}</p>}
    </form>
  );
}
