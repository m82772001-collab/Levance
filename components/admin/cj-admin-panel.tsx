"use client";

import { useActionState } from "react";
import {
  cjSearchAction,
  cjImportAction,
  cjSyncInventoryAction,
  type CjAdminState,
} from "@/lib/integrations/cj/admin-actions";
import { Button } from "@/components/ui/button";

export function CjAdminPanel() {
  const [searchState, searchAction, searching] = useActionState(
    cjSearchAction,
    {} as CjAdminState
  );
  const [importState, importAction, importing] = useActionState(
    cjImportAction,
    {} as CjAdminState
  );
  const [syncState, syncAction, syncing] = useActionState(
    async () => cjSyncInventoryAction(),
    {} as CjAdminState
  );

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-display text-xl">Search CJ catalogue</h2>
        <form action={searchAction} className="flex flex-wrap gap-3">
          <input
            name="query"
            required
            placeholder="Keyword…"
            className="flex-1 min-w-[200px] rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </Button>
        </form>
        {searchState.error && (
          <p className="text-sm text-danger">{searchState.error}</p>
        )}
        {searchState.products && searchState.products.length > 0 && (
          <ul className="divide-y divide-neutral-100 border border-neutral-100 rounded">
            {searchState.products.map((p) => (
              <li
                key={p.pid}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs text-neutral-500 font-mono">{p.pid}</p>
                  {p.price && (
                    <p className="text-xs text-neutral-500">Supplier ref: {p.price}</p>
                  )}
                </div>
                <form action={importAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="pid" value={p.pid} />
                  <input
                    name="markupPercent"
                    type="number"
                    defaultValue={40}
                    className="w-20 rounded border border-neutral-300 px-2 py-1 text-xs"
                    title="Markup %"
                  />
                  <label className="text-xs flex items-center gap-1">
                    <input type="checkbox" name="publish" />
                    Publish
                  </label>
                  <Button type="submit" variant="secondary" disabled={importing}>
                    Import
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {importState.success && (
          <p className="text-sm text-success">{importState.success}</p>
        )}
        {importState.error && (
          <p className="text-sm text-danger">{importState.error}</p>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-display text-xl mb-3">Inventory sync</h2>
        <p className="text-sm text-neutral-600 mb-4">
          Pulls stock for mapped CJ variants into LÉVANCE inventory (batch of 50).
        </p>
        <form action={syncAction}>
          <Button type="submit" disabled={syncing}>
            {syncing ? "Syncing…" : "Run inventory sync"}
          </Button>
        </form>
        {syncState.success && (
          <p className="mt-3 text-sm text-success">{syncState.success}</p>
        )}
        {syncState.error && (
          <p className="mt-3 text-sm text-danger">{syncState.error}</p>
        )}
      </section>
    </div>
  );
}
