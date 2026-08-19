"use client";

import { useActionState } from "react";
import { toggleWishlistAction, type AccountActionState } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";

export function WishlistToggle({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(
    toggleWishlistAction,
    {} as AccountActionState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <Button type="submit" variant="secondary" disabled={pending} className="w-full sm:w-auto">
        {pending ? "…" : state.success?.includes("Removed") ? "Add to wishlist" : "Wishlist"}
      </Button>
      {state.error && <p className="mt-2 text-xs text-danger">{state.error}</p>}
    </form>
  );
}
