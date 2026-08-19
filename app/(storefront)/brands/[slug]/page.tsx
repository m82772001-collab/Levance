import type { Metadata } from "next";
import { ProductCard } from "@/components/storefront/product-card";
import { getBrandBySlug, listProductsByBrand } from "@/lib/catalog/brands";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const brand = await getBrandBySlug(slug);
    return {
      title: `${brand.name} | LÉVANCE Showroom`,
      description: brand.description ?? `Explore ${brand.name} products at the LÉVANCE showroom.`,
    };
  } catch {
    return { title: "Brand | LÉVANCE Showroom" };
  }
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  const products = await listProductsByBrand(brand.id).catch(() => []);

  return (
    <div className="container-content py-12 md:py-16">
      <header className="max-w-3xl border-b border-neutral-200 pb-10">
        <p className="eyebrow mb-3">Showroom / Brand</p>
        <h1 className="font-display text-4xl md:text-5xl">{brand.name}</h1>
        {brand.description && <p className="mt-5 text-neutral-600 leading-relaxed">{brand.description}</p>}
        <p className="mt-6 text-xs leading-relaxed text-neutral-500">
          {brand.trademark_disclaimer_text}
        </p>
      </header>

      <section className="pt-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Collection</p>
            <h2 className="font-display text-2xl">Shop {brand.name}</h2>
          </div>
          <p className="text-sm text-neutral-500">{products.length} products</p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center text-sm text-neutral-500">
            This brand showroom is not carrying published inventory yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
