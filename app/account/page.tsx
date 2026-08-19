import Link from "next/link";
import { requireUser } from "@/lib/auth/rbac";
import { getUserMembership, getBenefitsForTier } from "@/lib/membership/queries";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const membership = await getUserMembership(user.id).catch(() => null);
  const tier = membership?.tier ?? user.membershipTier ?? "COMMON";
  const benefits = await getBenefitsForTier(tier).catch(() => []);

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Account</p>
          <h1 className="font-display text-3xl md:text-4xl">Welcome back</h1>
          <p className="mt-2 text-neutral-600">{user.email}</p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-8">
        <p className="eyebrow mb-2">Membership</p>
        <h2 className="font-display text-2xl">{tier}</h2>
        <p className="mt-1 text-sm text-neutral-500 capitalize">
          Status: {membership?.status ?? "active"}
        </p>
        {benefits.length > 0 && (
          <ul className="mt-6 space-y-2 text-sm text-neutral-700">
            {benefits.map((b) => (
              <li key={b.key} className="flex gap-2">
                <span className="text-champagne">·</span>
                <span>
                  <span className="font-medium">{b.label}</span>
                  {b.description && (
                    <span className="text-neutral-500"> — {b.description}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8">
          <Link
            href="/membership"
            className="text-sm font-medium text-obsidian underline-offset-4 hover:underline"
          >
            View all membership tiers
          </Link>
        </div>
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
