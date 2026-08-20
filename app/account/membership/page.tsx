import Link from "next/link";
import { requireUser } from "@/lib/auth/rbac";
import { getUserMembership, getBenefitsForTier } from "@/lib/membership/queries";

export const metadata = { title: "Membership" };

export default async function AccountMembershipPage() {
  const user = await requireUser();
  const membership = await getUserMembership(user.id).catch(() => null);
  const tier = membership?.tier ?? user.membershipTier;
  const benefits = await getBenefitsForTier(tier).catch(() => []);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <p className="eyebrow mb-2">Account</p>
        <h1 className="font-display text-3xl">Membership</h1>
        <p className="mt-2 text-neutral-600">Your current LÉVANCE membership.</p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-8">
        <p className="eyebrow mb-2">Current tier</p>
        <h2 className="font-display text-3xl">{tier}</h2>
        <p className="mt-2 text-sm text-neutral-500 capitalize">
          Status: {membership?.status ?? "active"}
        </p>
        {benefits.length > 0 && (
          <ul className="mt-6 space-y-3 text-sm text-neutral-700">
            {benefits.map((benefit) => (
              <li key={benefit.key}>
                <span className="font-medium">{benefit.label}</span>
                {benefit.description && <span className="text-neutral-500"> — {benefit.description}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/membership" className="text-sm font-medium underline-offset-4 hover:underline">
        Compare all membership tiers →
      </Link>
    </div>
  );
}
