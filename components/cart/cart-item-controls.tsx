"use client";

import { useActionState } from "react";
import {
  updateCartItemAction,
  removeCartItemAction,
  type CartActionState,
} from "@/lib/cart/actions";
import { Button } from "@/components/ui/button";

export function CartItemControls({
  itemId,
  quantity,
  max,
}: {
  itemId: string;
  quantity: number;
  max: number;
}) {
  const [updateState, updateAction, updating] = useActionState(
    updateCartItemAction,
    {} as CartActionState
  );
  const [, removeAction, removing] = useActionState(
    removeCartItemAction,
    {} as CartActionState
  );

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <form action={updateAction} className="flex items-center gap-2">
        <input type="hidden" name="itemId" value={itemId} />
        <input
          type="number"
          name="quantity"
          inputMode="numeric"
          min={1}
          max={Math.max(1, max)}
          defaultValue={quantity}
          className="min-h-11 w-16 rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <Button type="submit" variant="ghost" className="text-xs px-2 py-1" disabled={updating}>
          Update
        </Button>
      </form>
      <form action={removeAction}>
        <input type="hidden" name="itemId" value={itemId} />
        <Button type="submit" variant="ghost" className="text-xs px-2 py-1 text-danger" disabled={removing}>
          Remove
        </Button>
      </form>
      {updateState.error && (
        <span className="text-xs text-danger">{updateState.error}</span>
      )}
    </div>
  );
}
