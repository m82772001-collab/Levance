"use client";

import { useActionState, useState } from "react";
import {
  saveAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  type AccountActionState,
} from "@/lib/account/actions";
import { Button } from "@/components/ui/button";

type Address = {
  id: string;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country_code: string;
  phone: string | null;
  is_default: boolean;
};

export function AddressList({ addresses }: { addresses: Record<string, unknown>[] }) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveAddressAction,
    {} as AccountActionState
  );
  const [, deleteAction] = useActionState(deleteAddressAction, {} as AccountActionState);
  const [, defaultAction] = useActionState(setDefaultAddressAction, {} as AccountActionState);

  const list = addresses as unknown as Address[];

  return (
    <div className="space-y-6">
      {list.length === 0 && !showForm && (
        <p className="text-neutral-500 text-sm">No addresses saved yet.</p>
      )}

      <ul className="space-y-4">
        {list.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-neutral-200 bg-white p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          >
            <div className="text-sm">
              <p className="font-medium">
                {a.full_name}
                {a.is_default && (
                  <span className="ml-2 text-xs uppercase tracking-wide text-champagne-line">
                    Default
                  </span>
                )}
              </p>
              <p className="text-neutral-600 mt-1">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
              </p>
              <p className="text-neutral-600">
                {a.city}
                {a.state ? `, ${a.state}` : ""} {a.postal_code}
              </p>
              <p className="text-neutral-600">{a.country_code}</p>
              {a.phone && <p className="text-neutral-500 mt-1">{a.phone}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {!a.is_default && (
                <form action={defaultAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button type="submit" variant="ghost" className="text-xs px-3 py-1.5">
                    Set default
                  </Button>
                </form>
              )}
              <form action={deleteAction}>
                <input type="hidden" name="id" value={a.id} />
                <Button type="submit" variant="ghost" className="text-xs px-3 py-1.5 text-danger">
                  Delete
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {showForm ? (
        <form action={formAction} className="rounded-lg border border-neutral-200 bg-white p-6 space-y-4 max-w-lg">
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.success && <p className="text-sm text-success">{state.success}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Full name</label>
              <input name="fullName" required className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Address line 1</label>
              <input name="line1" required className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Line 2</label>
              <input name="line2" className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input name="city" required className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <input name="state" className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Postal code</label>
              <input name="postalCode" required className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country (ISO)</label>
              <input name="countryCode" defaultValue="US" required maxLength={2} className="w-full rounded border border-neutral-300 px-3 py-2 text-sm uppercase" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input name="phone" className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="isDefault" value="true" />
              Set as default
            </label>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save address"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
          Add address
        </Button>
      )}
    </div>
  );
}
