"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  query?: string;
  category?: string;
  sort: string;
  activeCount: number;
  categories: { id: string; slug: string; name: string }[];
};

export function MobileFilterDrawer({
  query,
  category,
  sort,
  activeCount,
  categories,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed bottom-4 left-1/2 z-40 flex min-h-11 min-w-11 -translate-x-1/2 items-center gap-2 rounded-full bg-obsidian px-5 text-sm font-medium text-ivory shadow-lg lg:hidden"
      >
        Filter
        {activeCount > 0 && (
          <span className="flex min-h-6 min-w-6 items-center justify-center rounded-full bg-ivory px-1 text-xs text-obsidian">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            className="absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-1rem)] flex-col rounded-t-2xl bg-ivory shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 id="mobile-filter-title" className="font-display text-xl">
                Filter & sort
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 min-w-11 rounded-full border border-neutral-200 text-sm"
                aria-label="Close filters"
              >
                ×
              </button>
            </div>

            <form
              action="/shop"
              method="get"
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={() => setOpen(false)}
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div>
                  <label htmlFor="mobile-q" className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                    Search
                  </label>
                  <input
                    id="mobile-q"
                    name="q"
                    defaultValue={query}
                    placeholder="Search…"
                    className="min-h-11 w-full rounded border border-neutral-300 px-3 text-sm focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne"
                  />
                </div>

                <div>
                  <label htmlFor="mobile-category" className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                    Category
                  </label>
                  <select
                    id="mobile-category"
                    name="category"
                    defaultValue={category ?? ""}
                    className="min-h-11 w-full rounded border border-neutral-300 px-3 text-sm"
                  >
                    <option value="">All</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="mobile-sort" className="mb-2 block text-xs uppercase tracking-wide text-neutral-500">
                    Sort
                  </label>
                  <select
                    id="mobile-sort"
                    name="sort"
                    defaultValue={sort}
                    className="min-h-11 w-full rounded border border-neutral-300 px-3 text-sm"
                  >
                    <option value="newest">Newest</option>
                    <option value="price_asc">Price: low to high</option>
                    <option value="price_desc">Price: high to low</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-neutral-200 bg-ivory px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/shop"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center justify-center rounded border border-neutral-300 px-4 text-sm font-medium"
                  >
                    Clear
                  </Link>
                  <button
                    type="submit"
                    className="min-h-11 rounded bg-obsidian px-4 text-sm font-medium text-ivory"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
