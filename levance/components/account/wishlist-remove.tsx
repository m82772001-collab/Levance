"use client";

import { useActionState } from "react";
import { toggleWishlistAction, type AccountActionState } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";

export function WishlistRemoveButton({ productId }: { productId: string }) {
  const [, formAction, pending] = useActionState(
    toggleWishlistAction,
    {} as AccountActionState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <Button type="submit" variant="ghost" className="text-xs" disabled={pending}>
        {pending ? "Removing…" : "Remove"}
      </Button>
    </form>
  );
}
