import Link from "next/link";
import { requireUser } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getUserMembership } from "@/lib/membership/queries";
import { formatMoney } from "@/lib/catalog/queries";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const [{ data: profile }, membership, { count: orderCount }, { count: wishlistCount }, { data: orders }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      getUserMembership(user.id).catch(() => null),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      (async () => {
        const { data: wishlist } = await supabase
          .from("wishlists")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!wishlist) return { count: 0 };
        return supabase
          .from("wishlist_items")
          .select("id", { count: "exact", head: true })
          .eq("wishlist_id", (wishlist as { id: string }).id);
      })(),
      supabase
        .from("orders")
        .select("id, order_number, status, total_cents, currency, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  const fullName = (profile as { full_name: string | null } | null)?.full_name?.trim();
  const tier = membership?.tier ?? user.membershipTier;
  const recentOrders = (orders ?? []) as {
    id: string;
    order_number: string;
    status: string;
    total_cents: number;
    currency: string;
    created_at: string;
  }[];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Account</p>
          <h1 className="font-display text-3xl md:text-4xl">
            Welcome{fullName ? `, ${fullName}` : " back"}
          </h1>
          <p className="mt-2 text-neutral-600">{user.email}</p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link href="/account/orders" className="rounded-lg border border-neutral-200 bg-white p-6 hover:shadow-card transition-shadow">
          <p className="eyebrow mb-2">Orders</p>
          <p className="font-display text-2xl">{orderCount ?? 0}</p>
          <p className="mt-1 text-sm text-neutral-500">All orders</p>
        </Link>
        <Link href="/account/wishlist" className="rounded-lg border border-neutral-200 bg-white p-6 hover:shadow-card transition-shadow">
          <p className="eyebrow mb-2">Wishlist</p>
          <p className="font-display text-2xl">{wishlistCount ?? 0}</p>
          <p className="mt-1 text-sm text-neutral-500">Saved pieces</p>
        </Link>
        <Link href="/account/membership" className="rounded-lg border border-neutral-200 bg-white p-6 hover:shadow-card transition-shadow">
          <p className="eyebrow mb-2">Membership</p>
          <p className="font-display text-2xl">{tier}</p>
          <p className="mt-1 text-sm text-neutral-500">Current tier</p>
        </Link>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Recent orders</p>
            <h2 className="font-display text-2xl">Your latest purchases</h2>
          </div>
          {recentOrders.length > 0 && (
            <Link href="/account/orders" className="text-sm font-medium underline-offset-4 hover:underline">
              View all
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="mt-6 rounded border border-dashed border-neutral-200 p-8 text-center">
            <p className="text-neutral-600">You have no orders yet.</p>
            <Link href="/shop" className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline">
              Browse the collection
            </Link>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-100">
            {recentOrders.map((order) => (
              <li key={order.id} className="py-4 first:pt-0 last:pb-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/account/orders/${order.id}`} className="font-medium underline-offset-4 hover:underline">
                    {order.order_number}
                  </Link>
                  <p className="text-sm text-neutral-500">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm capitalize text-neutral-600">{order.status.replace(/_/g, " ")}</p>
                  <p className="font-medium">{formatMoney(order.total_cents, order.currency)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/account/orders", label: "Orders", desc: "View past and current orders" },
          { href: "/account/wishlist", label: "Wishlist", desc: "Pieces you have saved" },
          { href: "/account/profile", label: "Profile", desc: "Name and account details" },
          { href: "/account/addresses", label: "Addresses", desc: "Shipping addresses" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-card"
          >
            <h3 className="font-display text-lg">{item.label}</h3>
            <p className="mt-1 text-sm text-neutral-500">{item.desc}</p>
          </Link>
        ))}
      </nav>
    </div>
  );
}
