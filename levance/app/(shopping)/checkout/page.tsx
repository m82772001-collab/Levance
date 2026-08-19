import Link from "next/link";
import { getCartLines } from "@/lib/cart/service";
import { getCurrentUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/catalog/queries";
import { CheckoutForm } from "@/components/cart/checkout-form";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [cart, user] = await Promise.all([
    getCartLines().catch(() => ({ lines: [], subtotal_cents: 0, currency: "USD" })),
    getCurrentUser(),
  ]);

  if (cart.lines.length === 0) {
    return (
      <div className="container-content py-16 text-center">
        <h1 className="font-display text-3xl">Checkout</h1>
        <p className="mt-4 text-neutral-600">Your cart is empty.</p>
        <Link href="/shop" className="mt-6 inline-block text-sm underline-offset-4 hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-content py-10 md:py-16">
      <h1 className="font-display text-3xl mb-8">Checkout</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <CheckoutForm defaultEmail={user?.email ?? ""} />
        <aside className="rounded-lg border border-neutral-200 bg-white p-6 h-fit space-y-3 text-sm">
          <h2 className="font-display text-lg mb-2">Order summary</h2>
          {cart.lines.map((l) => (
            <div key={l.id} className="flex justify-between gap-4">
              <span className="text-neutral-600 truncate">
                {l.product_name} × {l.quantity}
              </span>
              <span>{formatMoney(l.unit_price_cents * l.quantity, l.currency)}</span>
            </div>
          ))}
          <div className="border-t border-neutral-100 pt-3 flex justify-between font-medium">
            <span>Subtotal</span>
            <span>{formatMoney(cart.subtotal_cents, cart.currency)}</span>
          </div>
          <p className="text-xs text-neutral-500 pt-2">
            Totals are recalculated on the server. Payment is confirmed only via
            Stripe webhook — never from a browser redirect alone.
          </p>
        </aside>
      </div>
    </div>
  );
}
