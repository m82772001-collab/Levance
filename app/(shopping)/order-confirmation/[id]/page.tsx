import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { formatMoney } from "@/lib/catalog/queries";

export const metadata = { title: "Order confirmation" };

type Props = { params: Promise<{ id: string }> };

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, total_cents, currency, created_at")
    .eq("id", id)
    .maybeSingle();

  const o = order as {
    id: string;
    order_number: string;
    status: string;
    total_cents: number;
    currency: string;
  } | null;

  return (
    <div className="container-content py-16 md:py-24 max-w-lg mx-auto text-center">
      <p className="eyebrow mb-4">Thank you</p>
      <h1 className="font-display text-3xl md:text-4xl">Order received</h1>
      {o ? (
        <div className="mt-6 space-y-2 text-sm text-neutral-600">
          <p>
            Order <span className="font-medium text-obsidian">{o.order_number}</span>
          </p>
          <p className="capitalize">Status: {o.status.replace(/_/g, " ")}</p>
          <p>Total: {formatMoney(o.total_cents, o.currency)}</p>
          {o.status === "awaiting_payment" && (
            <p className="mt-4 text-neutral-500">
              Payment is confirmed only after Stripe notifies us via a verified
              webhook. If you completed payment, status will update shortly.
            </p>
          )}
          {o.status === "paid" && (
            <p className="mt-4 text-success">Payment confirmed.</p>
          )}
        </div>
      ) : (
        <p className="mt-6 text-neutral-600">
          We could not load this order. If you just checked out, it may still be
          processing.
        </p>
      )}
      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/account/orders"
          className="rounded bg-obsidian px-6 py-3 text-sm font-medium text-ivory"
        >
          View orders
        </Link>
        <Link
          href="/shop"
          className="rounded border border-obsidian px-6 py-3 text-sm font-medium"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
