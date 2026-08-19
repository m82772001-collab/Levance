import Link from "next/link";
import {
  getProductBySlug,
  getRelatedProducts,
  getReviewsForProduct,
  formatMoney,
} from "@/lib/catalog/queries";
import { ProductCard } from "@/components/storefront/product-card";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";
import { WishlistToggle } from "@/components/storefront/wishlist-toggle";
import { getCurrentUser } from "@/lib/auth/session";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    return {
      title: product.name,
      description: product.description?.slice(0, 160) ?? `Shop ${product.name} at LÉVANCE.`,
      openGraph: {
        title: product.name,
        description: product.description?.slice(0, 160) ?? undefined,
        images: product.images[0]?.url ? [{ url: product.images[0].url }] : undefined,
      },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const [related, reviews, user] = await Promise.all([
    getRelatedProducts(product.id, product.category_id),
    getReviewsForProduct(product.id),
    getCurrentUser(),
  ]);

  const defaultVariant = product.variants[0];
  const minPrice = product.variants.reduce(
    (min, v) => Math.min(min, v.price_cents),
    defaultVariant?.price_cents ?? 0
  );

  return (
    <div className="container-content py-10 md:py-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-[4/5] rounded-lg bg-neutral-100 overflow-hidden">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0].url}
                alt={product.images[0].alt_text ?? product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-neutral-400 text-sm">
                No image
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(0, 4).map((img) => (
                <div key={img.id} className="aspect-square rounded bg-neutral-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && (
            <p className="text-xs uppercase tracking-widest2 text-neutral-500 mb-2">
              {product.brand}
            </p>
          )}
          <h1 className="font-display text-3xl md:text-4xl leading-tight">{product.name}</h1>
          <p className="mt-4 text-lg font-medium">
            {defaultVariant
              ? formatMoney(minPrice, defaultVariant.currency)
              : "—"}
            {defaultVariant?.compare_at_price_cents != null &&
              defaultVariant.compare_at_price_cents > minPrice && (
                <span className="ml-2 text-sm text-neutral-400 line-through">
                  {formatMoney(defaultVariant.compare_at_price_cents, defaultVariant.currency)}
                </span>
              )}
          </p>

          {product.description && (
            <p className="mt-6 text-neutral-600 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          <div className="mt-8 space-y-4">
            <AddToCartForm variants={product.variants} />
            {user && <WishlistToggle productId={product.id} />}
          </div>

          <div className="mt-10 space-y-6 border-t border-neutral-200 pt-8 text-sm text-neutral-600">
            <div>
              <h2 className="font-medium text-obsidian mb-1">Shipping</h2>
              <p>Orders are fulfilled after payment confirmation. Delivery times vary by destination.</p>
            </div>
            <div>
              <h2 className="font-medium text-obsidian mb-1">Returns</h2>
              <p>Eligible items may be returned within 14 days of delivery in original condition.</p>
            </div>
          </div>
        </div>
      </div>

      {reviews.length > 0 && (
        <section className="mt-16 border-t border-neutral-200 pt-12">
          <h2 className="font-display text-2xl mb-6">Reviews</h2>
          <ul className="space-y-6 max-w-2xl">
            {(reviews as { id: string; rating: number; title: string | null; body: string | null; created_at: string }[]).map(
              (r) => (
                <li key={r.id} className="border-b border-neutral-100 pb-6">
                  <p className="text-sm font-medium">
                    {r.rating}/5{r.title ? ` — ${r.title}` : ""}
                  </p>
                  {r.body && <p className="mt-2 text-sm text-neutral-600">{r.body}</p>}
                  <p className="mt-2 text-xs text-neutral-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </li>
              )
            )}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16 border-t border-neutral-200 pt-12">
          <h2 className="font-display text-2xl mb-8">Related</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
