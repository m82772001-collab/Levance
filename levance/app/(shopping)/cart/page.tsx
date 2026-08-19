import Link from "next/link";
import { getCartLines } from "@/lib/cart/service";
import { formatMoney } from "@/lib/catalog/queries";
import { CartItemControls } from "@/components/cart/cart-item-controls";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const { lines, subtotal_cents, currency } = await getCartLines().catch(() => ({
    lines: [],
    subtotal_cents: 0,
    currency: "USD",
  }));

  return (
    <div className="container-content py-10 md:py-16">
      <h1 className="font-display text-3xl mb-8">Cart</h1>

      {lines.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <p className="text-neutral-600">Your cart is empty.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-6">
            {lines.map((line) => (
              <li
                key={line.id}
                className="flex gap-4 border-b border-neutral-100 pb-6"
              >
                <div className="h-24 w-20 shrink-0 rounded bg-neutral-100 overflow-hidden">
                  {line.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${line.product_slug}`}
                    className="font-medium hover:underline"
                  >
                    {line.product_name}
                  </Link>
                  {Object.keys(line.attributes).length > 0 && (
                    <p className="text-xs text-neutral-500 mt-1">
                      {Object.entries(line.attributes)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                  )}
                  <p className="text-sm mt-2">
                    {formatMoney(line.unit_price_cents, line.currency)}
                  </p>
                  <CartItemControls
                    itemId={line.id}
                    quantity={line.quantity}
                    max={line.quantity_available}
                  />
                </div>
                <p className="text-sm font-medium shrink-0">
                  {formatMoney(line.unit_price_cents * line.quantity, line.currency)}
                </p>
              </li>
            ))}
          </ul>

          <aside className="rounded-lg border border-neutral-200 bg-white p-6 h-fit space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-medium">{formatMoney(subtotal_cents, currency)}</span>
            </div>
            <p className="text-xs text-neutral-500">
              Shipping and taxes calculated at checkout. Prices are validated server-side.
            </p>
            <Link
              href="/checkout"
              className="block w-full rounded bg-obsidian px-4 py-3 text-center text-sm font-medium text-ivory"
            >
              Proceed to checkout
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
