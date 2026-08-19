import Link from "next/link";
import { listProducts, listCategories } from "@/lib/catalog/queries";
import { ProductCard } from "@/components/storefront/product-card";

export const metadata = {
  title: "LÉVANCE — Elevate Your Everyday",
  description:
    "A premium curated marketplace for fashion, beauty, technology, accessories, home and lifestyle.",
};

export default async function HomePage() {
  const [newArrivals, categories] = await Promise.all([
    listProducts({ sort: "newest", pageSize: 4 }).catch(() => ({
      products: [],
      total: 0,
      page: 1,
      pageSize: 4,
    })),
    listCategories().catch(() => []),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-obsidian text-ivory">
        <div className="container-content flex min-h-[70vh] flex-col items-center justify-center text-center py-24">
          <p className="eyebrow mb-6 text-champagne">LÉVANCE</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[1.05]">
            Elevate Your Everyday.
          </h1>
          <p className="mt-6 max-w-xl text-neutral-300">
            Discover carefully curated pieces designed to bring luxury, style and
            innovation into everyday life.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/shop"
              className="rounded bg-champagne px-6 py-3 text-sm font-medium text-obsidian tracking-wide"
            >
              Shop Collection
            </Link>
            <Link
              href="/membership"
              className="rounded border border-neutral-600 px-6 py-3 text-sm font-medium tracking-wide hover:border-champagne"
            >
              Membership
            </Link>
          </div>
        </div>
      </section>

      {/* Featured collections */}
      {categories.length > 0 && (
        <section className="container-content py-16 md:py-24">
          <p className="eyebrow mb-3 text-center">Explore</p>
          <h2 className="font-display text-3xl text-center mb-10">Featured Collections</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="rounded-lg border border-neutral-200 bg-white p-6 text-center transition-shadow hover:shadow-card"
              >
                <span className="font-display text-lg">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* New arrivals */}
      <section className="border-t border-neutral-200 bg-ivory-muted/50">
        <div className="container-content py-16 md:py-24">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="eyebrow mb-2">Just in</p>
              <h2 className="font-display text-3xl">New Arrivals</h2>
            </div>
            <Link href="/shop?sort=newest" className="text-sm font-medium underline-offset-4 hover:underline">
              View all
            </Link>
          </div>
          {newArrivals.products.length === 0 ? (
            <p className="text-center text-neutral-500 text-sm py-12">
              Catalogue is being prepared. Seed development products appear here after migrations.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {newArrivals.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Membership teaser */}
      <section className="bg-obsidian text-ivory">
        <div className="container-content py-20 text-center">
          <p className="eyebrow mb-4 text-champagne">Membership</p>
          <h2 className="font-display text-3xl md:text-4xl">Belong to LÉVANCE</h2>
          <p className="mt-4 max-w-lg mx-auto text-neutral-400 text-sm">
            From free Common access to invitation-only Monarch. Choose the level
            that fits your everyday.
          </p>
          <Link
            href="/membership"
            className="mt-8 inline-block rounded border border-champagne/50 px-6 py-3 text-sm font-medium text-champagne hover:bg-champagne/10"
          >
            Explore tiers
          </Link>
        </div>
      </section>

      {/* Newsletter placeholder — no fake claims */}
      <section className="container-content py-16 md:py-20 text-center">
        <h2 className="font-display text-2xl">Stay informed</h2>
        <p className="mt-3 text-sm text-neutral-500 max-w-md mx-auto">
          Newsletter signup will be available once email delivery is configured.
        </p>
      </section>
    </>
  );
}
