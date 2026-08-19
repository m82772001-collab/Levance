"use client";

import { useActionState, useState } from "react";
import { addToCartAction, type CartActionState } from "@/lib/cart/actions";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/catalog/queries";

type Variant = {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price_cents: number;
  currency: string;
  quantity_available: number;
};

export function AddToCartForm({ variants }: { variants: Variant[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [state, formAction, pending] = useActionState(
    addToCartAction,
    {} as CartActionState
  );

  const selected = variants.find((v) => v.id === variantId) ?? variants[0];
  const maxQty = selected?.quantity_available ?? 0;

  if (!variants.length) {
    return <p className="text-sm text-neutral-500">Currently unavailable.</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="variantId" value={variantId} />
      {variants.length > 1 && (
        <div>
          <label className="block text-xs uppercase tracking-wide text-neutral-500 mb-2">
            Options
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const label = Object.values(v.attributes).join(" / ") || v.sku;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  disabled={v.quantity_available === 0}
                  className={`rounded border px-3 py-2 text-sm ${
                    v.id === variantId
                      ? "border-obsidian bg-obsidian text-ivory"
                      : "border-neutral-300 hover:border-obsidian disabled:opacity-40"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <label className="text-xs uppercase tracking-wide text-neutral-500">Qty</label>
        <input
          type="number"
          name="quantity"
          min={1}
          max={Math.max(1, maxQty)}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="w-20 rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        {selected && (
          <span className="text-sm text-neutral-500">
            {maxQty === 0 ? "Out of stock" : `${maxQty} available`}
          </span>
        )}
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}

      <Button type="submit" disabled={pending || maxQty === 0} className="w-full sm:w-auto">
        {pending
          ? "Adding…"
          : maxQty === 0
            ? "Out of stock"
            : `Add to cart — ${formatMoney(selected.price_cents, selected.currency)}`}
      </Button>
    </form>
  );
}
