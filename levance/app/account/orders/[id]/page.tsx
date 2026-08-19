import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { formatMoney } from "@/lib/catalog/queries";

export const metadata = { title: "Order detail" };

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) notFound();

  const o = order as {
    id: string;
    order_number: string;
    status: string;
    subtotal_cents: number;
    shipping_cents: number;
    total_cents: number;
    currency: string;
    shipping_address: Record<string, string>;
    created_at: string;
  };

  const [{ data: items }, { data: payments }, { data: shipments }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", o.id),
    supabase.from("payments").select("status, amount_cents, provider, created_at").eq("order_id", o.id),
    supabase
      .from("shipments")
      .select("carrier, tracking_number, status, updated_at")
      .eq("order_id", o.id),
  ]);

  const addr = o.shipping_address ?? {};

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link href="/account/orders" className="text-sm text-neutral-500 hover:text-obsidian">
          ← Orders
        </Link>
        <h1 className="font-display text-3xl mt-2">Order {o.order_number}</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Placed {new Date(o.created_at).toLocaleString()} ·{" "}
          <span className="capitalize">{o.status.replace(/_/g, " ")}</span>
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-6 space-y-3">
        <h2 className="font-display text-lg">Items</h2>
        <ul className="divide-y divide-neutral-100">
          {((items ?? []) as {
            product_name_snapshot: string;
            quantity: number;
            unit_price_cents: number;
          }[]).map((item, i) => (
            <li key={i} className="py-3 flex justify-between text-sm">
              <span>
                {item.product_name_snapshot} × {item.quantity}
              </span>
              <span className="font-medium">
                {formatMoney(item.unit_price_cents * item.quantity, o.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-neutral-100 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Subtotal</span>
            <span>{formatMoney(o.subtotal_cents, o.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Shipping</span>
            <span>{formatMoney(o.shipping_cents, o.currency)}</span>
          </div>
          <div className="flex justify-between font-medium text-base pt-1">
            <span>Total</span>
            <span>{formatMoney(o.total_cents, o.currency)}</span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6 text-sm space-y-2">
        <h2 className="font-display text-lg mb-2">Shipping address</h2>
        <p>{addr.full_name}</p>
        <p>{addr.line1}</p>
        {addr.line2 && <p>{addr.line2}</p>}
        <p>
          {addr.city}
          {addr.state ? `, ${addr.state}` : ""} {addr.postal_code}
        </p>
        <p>{addr.country_code}</p>
      </section>

      {payments && payments.length > 0 && (
        <section className="rounded-lg border border-neutral-200 bg-white p-6 text-sm">
          <h2 className="font-display text-lg mb-2">Payment</h2>
          {(payments as { status: string; amount_cents: number; provider: string }[]).map(
            (p, i) => (
              <p key={i} className="capitalize">
                {p.provider}: {p.status} — {formatMoney(p.amount_cents, o.currency)}
              </p>
            )
          )}
        </section>
      )}

      {shipments && shipments.length > 0 && (
        <section className="rounded-lg border border-neutral-200 bg-white p-6 text-sm space-y-2">
          <h2 className="font-display text-lg mb-2">Shipment</h2>
          {(
            shipments as {
              carrier: string | null;
              tracking_number: string | null;
              status: string;
            }[]
          ).map((s, i) => (
            <div key={i}>
              <p className="capitalize">Status: {s.status}</p>
              {s.carrier && <p>Carrier: {s.carrier}</p>}
              {s.tracking_number && <p>Tracking: {s.tracking_number}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
