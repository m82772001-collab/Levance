"use client";

import { useActionState } from "react";
import { checkoutAction, type CheckoutState } from "@/lib/orders/actions";
import { Button } from "@/components/ui/button";

export function CheckoutForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, pending] = useActionState(
    checkoutAction,
    {} as CheckoutState
  );

  return (
    <form action={formAction} autoComplete="shipping" className="space-y-5 max-w-lg">
      {state.error && (
        <p role="alert" className="text-sm text-danger rounded border border-danger/30 bg-danger/5 px-4 py-3">
          {state.error}
        </p>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
          className="min-h-11 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Full name</label>
        <input
          name="fullName"
          autoComplete="name"
          required
          className="min-h-11 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Address</label>
        <input
          name="line1"
          autoComplete="shipping address-line1"
          required
          className="min-h-11 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Apartment, suite (optional)</label>
        <input
          name="line2"
          autoComplete="shipping address-line2"
          className="min-h-11 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input
            name="city"
            autoComplete="shipping address-level2"
            required
            className="min-h-11 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">State</label>
          <input
            name="state"
            autoComplete="shipping address-level1"
            className="min-h-11 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Postal code</label>
          <input
            name="postalCode"
            inputMode="numeric"
            autoComplete="shipping postal-code"
            required
            className="min-h-11 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Country</label>
          <input
            name="countryCode"
            autoComplete="shipping country"
            defaultValue="US"
            required
            maxLength={2}
            className="min-h-11 w-full rounded border border-neutral-300 px-3 py-2 text-sm uppercase"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="min-h-11 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Preparing order…" : "Place order"}
      </Button>
      <p className="text-xs text-neutral-500">
        You will not be charged until Stripe confirms payment via webhook.
      </p>
    </form>
  );
}
