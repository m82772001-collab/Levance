"use client";

import { useActionState } from "react";
import { reorderAction, type AccountActionState } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";

export function ReorderButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(
    reorderAction,
    {} as AccountActionState
  );

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="orderId" value={orderId} />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Adding…" : "Reorder"}
        </Button>
      </form>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
    </div>
  );
}
