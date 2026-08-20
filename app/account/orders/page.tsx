import Link from "next/link";
import { requireUser } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { formatMoney } from "@/lib/catalog/queries";

export const metadata = { title: "Orders" };

const PAGE_SIZE = 10;

type Props = { searchParams: Promise<{ page?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const user = await requireUser();
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const supabase = await createSupabaseServerClient();

  const { data: orders, count, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total_cents, currency, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const list = (orders ?? []) as {
    id: string;
    order_number: string;
    status: string;
    total_cents: number;
    currency: string;
    created_at: string;
  }[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Account</p>
        <h1 className="font-display text-3xl">Orders</h1>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center">
          <p className="text-neutral-600">You have no orders yet.</p>
          <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-obsidian underline-offset-4 hover:underline">
            Browse the collection
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} className="border-t border-neutral-100">
                    <td className="px-4 py-3">
                      <Link href={`/account/orders/${o.id}`} className="font-medium text-obsidian underline-offset-2 hover:underline">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 capitalize text-neutral-600">{o.status.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(o.total_cents, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between gap-4 text-sm" aria-label="Order pagination">
              {page > 1 ? <Link href={`/account/orders?page=${page - 1}`} className="underline-offset-4 hover:underline">← Previous</Link> : <span className="text-neutral-400">← Previous</span>}
              <span className="text-neutral-500">Page {page} of {totalPages}</span>
              {page < totalPages ? <Link href={`/account/orders?page=${page + 1}`} className="underline-offset-4 hover:underline">Next →</Link> : <span className="text-neutral-400">Next →</span>}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
