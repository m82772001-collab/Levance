import Link from "next/link";
import type { ProductListItem } from "@/lib/catalog/queries";
import { formatMoney } from "@/lib/catalog/queries";

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block rounded-lg overflow-hidden border border-neutral-200 bg-white transition-shadow hover:shadow-card"
    >
      <div className="aspect-[4/5] bg-neutral-100 overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 ease-signature group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-neutral-400 text-xs">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        {product.brand && (
          <p className="text-xs uppercase tracking-wide text-neutral-500">{product.brand}</p>
        )}
        <h3 className="mt-1 font-medium text-obsidian leading-snug">{product.name}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          {product.min_price_cents != null && (
            <span className="text-sm font-medium">
              {formatMoney(product.min_price_cents, product.currency)}
            </span>
          )}
          {product.compare_at_cents != null &&
            product.min_price_cents != null &&
            product.compare_at_cents > product.min_price_cents && (
              <span className="text-xs text-neutral-400 line-through">
                {formatMoney(product.compare_at_cents, product.currency)}
              </span>
            )}
        </div>
      </div>
    </Link>
  );
}
