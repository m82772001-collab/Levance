import Link from "next/link";
import { SiteHeader } from "@/components/shared/header";
import { SiteFooter } from "@/components/shared/footer";
import { getMembershipTiers, getAllBenefitsGrouped } from "@/lib/membership/queries";
import { getCurrentUser } from "@/lib/auth/session";
import type { MembershipTier } from "@/lib/membership/types";

export const metadata = {
  title: "Membership",
};

const TIER_TAGLINES: Record<MembershipTier, string> = {
  COMMON: "Your LÉVANCE experience starts here.",
  PRO: "More access. More advantages.",
  PREMIUM: "An elevated LÉVANCE experience.",
  MONARCH: "Reserved for those personally invited.",
};

export default async function MembershipPage() {
  const [tiers, benefits, user] = await Promise.all([
    getMembershipTier().catch(() => []),
    getAllBenefitsGrouped().catch(() => ({
      COMMON: [],
      PRO: [],
      PREMIUM: [],
      MONARCH: [],
    })),
    getCurrentUser(),
  ]);

  const ordered: MembershipTier[] = ["COMMON", "PRO", "PREMIUM", "MONARCH"];
  const tierMap = Object.fromEntries(tiers.map((t) => [t.tier, t]));

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-neutral-200 bg-obsidian text-ivory">
          <div className="container-content py-20 md:py-28 text-center">
            <p className="eyebrow mb-4 text-champagne">Membership</p>
            <h1 className="font-display text-4xl md:text-6xl leading-tight">
              Belong to LÉVANCE
            </h1>
            <p className="mt-6 mx-auto max-w-xl text-neutral-300">
              Four carefully considered levels of access. From the free Common
              experience to the invitation-only Monarch circle.
            </p>
          </div>
        </section>

        <section className="container-content py-16 md:py-24">
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {ordered.map((tierKey) => {
              const tier = tierMap[tierKey];
              const isMonarch = tierKey === "MONARCH";
              const isCurrent = user?.membershipTier === tierKey;
              const canPurchase =
                tier?.is_publicly_purchasable === true && !isMonarch;

              return (
                <article
                  key={tierKey}
                  className={`flex flex-col rounded-lg border p-8 ${
                    isMonarch
                      ? "border-champagne/40 bg-obsidian text-ivory"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <p
                    className={`eyebrow mb-3 ${
                      isMonarch ? "text-champagne" : "text-neutral-500"
                    }`}
                  >
                    {tier?.name ?? tierKey}
                  </p>
                  <h2 className="font-display text-2xl">
                    {TIER_TAGLINES[tierKey]}
                  </h2>

                  <ul className="mt-8 flex-1 space-y-3 text-sm">
                    {(benefits[tierKey] ?? []).map((b) => (
                      <li key={b.key} className="flex gap-2">
                        <span
                          className={
                            isMonarch ? "text-champagne" : "text-champagne-line"
                          }
                        >
                          ·
                        </span>
                        <span>
                          <span className="font-medium">{b.label}</span>
                          {b.description && (
                            <span
                              className={
                                isMonarch
                                  ? "block text-neutral-400"
                                  : "block text-neutral-500"
                              }
                            >
                              {b.description}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-10">
                    {isCurrent ? (
                      <span
                        className={`inline-block rounded px-4 py-2 text-sm font-medium ${
                          isMonarch
                            ? "bg-champagne/20 text-champagne"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        Your current membership
                      </span>
                    ) : isMonarch ? (
                      <p className="text-sm text-neutral-400">
                        Invitation only. There is no public purchase path.
                      </p>
                    ) : canPurchase ? (
                      <Link
                        href={user ? `/account?upgrade=${tierKey}` : "/signup"}
                        className="inline-flex items-center justify-center rounded bg-obsidian px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:bg-neutral-800"
                      >
                        {user ? `Explore ${tier?.name}` : "Create account"}
                      </Link>
                    ) : (
                      <Link
                        href={user ? "/account" : "/signup"}
                        className="inline-flex items-center justify-center rounded border border-obsidian px-5 py-2.5 text-sm font-medium transition-colors hover:bg-obsidian hover:text-ivory"
                      >
                        {user ? "Your account" : "Start free"}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mt-16 text-center text-sm text-neutral-500 max-w-2xl mx-auto">
            Paid memberships (Pro and Premium) will be activated only after a
            verified Stripe webhook confirms payment. Monarch membership is
            granted solely through a personal founder invitation — never via a
            public checkout, fixed access code, or self-service upgrade.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
