import Link from "next/link";
import { listProducts, listCategories } from "@/lib/catalog/queries";
import { listBrands } from "@/lib/catalog/brands";
import { ProductCard } from "@/components/storefront/product-card";
import { Emblem } from "@/components/shared/emblem";

export const metadata = {
  title: "LÉVANCE — Elevate Your Everyday",
  description: "A premium curated marketplace for fashion, beauty, technology, accessories, home and lifestyle.",
};

export default async function HomePage() {
  const [newArrivals, categories, brands] = await Promise.all([
    listProducts({ sort: "newest", pageSize: 4 }).catch(() => ({ products: [], total: 0, page: 1, pageSize: 4 })),
    listCategories().catch(() => []),
    listBrands(8).catch(() => []),
  ]);

  return (
    <>
      <section className="bg-obsidian text-ivory">
        <div className="container-content flex min-h-[78vh] flex-col items-center justify-center py-24 text-center">
          <Emblem variant="hero" />
          <p className="eyebrow mb-5 mt-7 text-champagne">LÉVANCE</p>
          <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">Elevate Your Everyday.</h1>
          <p className="mt-6 max-w-xl text-neutral-300">Discover carefully curated pieces designed to bring luxury, style and innovation into everyday life.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/login" className="rounded bg-champagne px-6 py-3 text-sm font-medium tracking-wide text-obsidian">Enter the Showroom</Link>
            <Link href="/shop" className="rounded border border-neutral-600 px-6 py-3 text-sm font-medium tracking-wide hover:border-champagne">Explore Collection</Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="container-content py-16 md:py-24">
          <p className="eyebrow mb-3 text-center">Explore</p>
          <h2 className="mb-10 text-center font-display text-3xl">Featured Collections</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {categories.slice(0, 6).map((c) => <Link key={c.id} href={`/category/${c.slug}`} className="rounded-lg border border-neutral-200 bg-white p-6 text-center transition-shadow hover:shadow-card"><span className="font-display text-lg">{c.name}</span></Link>)}
          </div>
        </section>
      )}

      {brands.length > 0 && (
        <section className="border-y border-neutral-200 bg-white">
          <div className="container-content py-14 md:py-18">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div><p className="eyebrow mb-2">The Showroom</p><h2 className="font-display text-3xl">Shop by Brand</h2></div>
              <span className="text-xs text-neutral-500">Curated third-party brands</span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
              {brands.map((brand) => (
                <Link key={brand.id} href={`/brands/${brand.slug}`} className="rounded-lg border border-neutral-200 px-4 py-5 text-center transition-colors hover:border-obsidian">
                  <span className="font-medium">{brand.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-neutral-200 bg-ivory-muted/50">
        <div className="container-content py-16 md:py-24">
          <div className="mb-10 flex items-end justify-between"><div><p className="eyebrow mb-2">Just in</p><h2 className="font-display text-3xl">New Arrivals</h2></div><Link href="/shop?sort=newest" className="text-sm font-medium underline-offset-4 hover:underline">View all</Link></div>
          {newArrivals.products.length === 0 ? <p className="py-12 text-center text-sm text-neutral-500">Catalogue is being prepared.</p> : <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">{newArrivals.products.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
        </div>
      </section>

      <section className="bg-obsidian text-ivory"><div className="container-content py-20 text-center"><p className="eyebrow mb-4 text-champagne">Membership</p><h2 className="font-display text-3xl md:text-4xl">Belong to LÉVANCE</h2><p className="mx-auto mt-4 max-w-lg text-sm text-neutral-400">From free Common access to invitation-only Monarch. Choose the level that fits your everyday.</p><Link href="/membership" className="mt-8 inline-block rounded border border-champagne/50 px-6 py-3 text-sm font-medium text-champagne hover:bg-champagne/10">Explore tiers</Link></div></section>

      <section className="container-content py-16 text-center md:py-20"><h2 className="font-display text-2xl">Stay informed</h2><p className="mx-auto mt-3 max-w-md text-sm text-neutral-500">Newsletter signup will be available once email delivery is configured.</p></section>
    </>
  );
}
