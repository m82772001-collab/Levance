import Link from "next/link";
import { listProducts, listCategories } from "@/lib/catalog/queries";
import { ProductCard } from "@/components/storefront/product-card";
import { MobileFilterDrawer } from "@/components/storefront/mobile-filter-drawer";

export const metadata = {
  title: "Shop",
  description: "Browse the LÉVANCE curated collection.",
};

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    page?: string;
    min?: string;
    max?: string;
  }>;
};

export default async function ShopPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const sort = (params.sort as "newest" | "price_asc" | "price_desc" | "name") || "newest";

  const categories = await listCategories().catch(() => []);
  const category = params.category
    ? categories.find((c) => c.slug === params.category)
    : undefined;

  const { products, total, pageSize } = await listProducts({
    search: params.q,
    categoryId: category?.id,
    sort,
    page,
    pageSize: 12,
    minPriceCents: params.min ? Math.round(Number(params.min) * 100) : undefined,
    maxPriceCents: params.max ? Math.round(Number(params.max) * 100) : undefined,
  }).catch(() => ({ products: [], total: 0, pageSize: 12, page: 1 }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeFilterCount = [
    params.q?.trim(),
    params.category,
    params.sort && params.sort !== "newest" ? params.sort : undefined,
    params.min,
    params.max,
  ].filter(Boolean).length;

  return (
    <div className="container-content py-10 md:py-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-10">
        <div>
          <p className="eyebrow mb-2">Collection</p>
          <h1 className="font-display text-3xl md:text-4xl">Shop</h1>
          <p className="mt-2 text-sm text-neutral-500">
            {total} {total === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-8">
          <form className="space-y-4">
            <div>
              <label htmlFor="q" className="block text-xs uppercase tracking-wide text-neutral-500 mb-2">
                Search
              </label>
              <input
                id="q"
                name="q"
                defaultValue={params.q}
                placeholder="Search…"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne"
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-xs uppercase tracking-wide text-neutral-500 mb-2">
                Category
              </label>
              <select
                id="category"
                name="category"
                defaultValue={params.category ?? ""}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
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
              <label htmlFor="sort" className="block text-xs uppercase tracking-wide text-neutral-500 mb-2">
                Sort
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded bg-obsidian px-4 py-2.5 text-sm font-medium text-ivory"
            >
              Apply
            </button>
          </form>
        </aside>

        <div>
          {products.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
              <p className="text-neutral-600">No products match your filters.</p>
              <Link href="/shop" className="mt-4 inline-block text-sm underline-offset-4 hover:underline">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-12 flex justify-center gap-2" aria-label="Pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.category) sp.set("category", params.category);
                if (sort) sp.set("sort", sort);
                sp.set("page", String(n));
                return (
                  <Link
                    key={n}
                    href={`/shop?${sp.toString()}`}
                    className={`min-w-10 rounded px-3 py-2 text-sm text-center ${
                      n === page
                        ? "bg-obsidian text-ivory"
                        : "border border-neutral-200 hover:border-obsidian"
                    }`}
                  >
                    {n}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      <MobileFilterDrawer
        query={params.q}
        category={params.category}
        sort={sort}
        activeCount={activeFilterCount}
        categories={categories}
      />
    </div>
  );
}
