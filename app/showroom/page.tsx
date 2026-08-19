import Link from "next/link";
import { requireShowroomAccess } from "@/lib/ai/access";
import { getRecommendations } from "@/lib/ai/recommendations";
import { listCollections } from "@/lib/ai/collections";
import { ProductCard } from "@/components/storefront/product-card";
import { ConciergePanel } from "@/components/ai/concierge-panel";
import { VoiceStatus } from "@/components/ai/voice-status";
import { CollectionBuilder } from "@/components/ai/collection-builder";
import {
  isAiFeatureEnabled,
  isAiProviderConfigured,
  isVoiceProviderConfigured,
} from "@/lib/integrations/ai/config";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

export const metadata = {
  title: "Private Showroom",
  robots: { index: false, follow: false },
};

export default async function ShowroomPage() {
  const user = await requireShowroomAccess();

  const [recommendations, collections, wishlistCount] = await Promise.all([
    getRecommendations(user.id, 4).catch(() => []),
    listCollections(user.id).catch(() => []),
    (async () => {
      try {
        const supabase = await createSupabaseServerClient();
        const { data: w } = await supabase
          .from("wishlists")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!w) return 0;
        const { count } = await supabase
          .from("wishlist_items")
          .select("id", { count: "exact", head: true })
          .eq("wishlist_id", (w as { id: string }).id);
        return count ?? 0;
      } catch {
        return 0;
      }
    })(),
  ]);

  const aiConfigured = isAiProviderConfigured();
  const voiceConfigured = isVoiceProviderConfigured();

  return (
    <div className="container-content py-10 md:py-16 space-y-16">
      <section className="max-w-2xl">
        <p className="eyebrow mb-3 text-champagne-line">Private Showroom</p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight">Welcome back.</h1>
        <p className="mt-4 text-neutral-600">
          Your Premium space for private discovery, collections, and the LÉVANCE concierge.
        </p>
        <p className="mt-2 text-xs uppercase tracking-wide text-neutral-400">
          Membership · {user.membershipTier}
        </p>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-14">
          {/* Chosen for you */}
          <section>
            <h2 className="font-display text-2xl mb-6">Chosen For You</h2>
            {!isAiFeatureEnabled("AI_RECOMMENDATIONS") ? (
              <p className="text-sm text-neutral-500">
                Personalized recommendations are disabled in this environment.
              </p>
            ) : recommendations.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Explore the shop and wishlist pieces — recommendations will refine from real
                activity.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {recommendations.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-end justify-between mb-6">
              <h2 className="font-display text-2xl">Saved Collections</h2>
            </div>
            {collections.length === 0 ? (
              <p className="text-sm text-neutral-500 mb-6">
                No saved collections yet. Ask the concierge or build one below.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 mb-8">
                {collections.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-neutral-200 bg-white p-5"
                  >
                    <h3 className="font-medium">{c.name}</h3>
                    {c.description && (
                      <p className="mt-1 text-xs text-neutral-500 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs uppercase tracking-wide text-neutral-400">
                      {c.source === "ai" ? "AI-built" : "Yours"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <CollectionBuilder />
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/account/wishlist"
              className="rounded-lg border border-neutral-200 bg-white p-6 hover:shadow-card transition-shadow"
            >
              <p className="eyebrow mb-2">Wishlist</p>
              <p className="font-display text-xl">{wishlistCount} saved</p>
            </Link>
            <Link
              href="/account/ai-memory"
              className="rounded-lg border border-neutral-200 bg-white p-6 hover:shadow-card transition-shadow"
            >
              <p className="eyebrow mb-2">Personal archive</p>
              <p className="font-display text-xl">AI memory</p>
            </Link>
            <Link
              href="/membership"
              className="rounded-lg border border-neutral-200 bg-white p-6 hover:shadow-card transition-shadow"
            >
              <p className="eyebrow mb-2">Membership</p>
              <p className="font-display text-xl">{user.membershipTier}</p>
            </Link>
          </section>
        </div>

        <aside className="space-y-6">
          <ConciergePanel
            context="showroom"
            configured={aiConfigured}
            voiceConfigured={voiceConfigured}
          />
          <VoiceStatus configured={voiceConfigured} />
        </aside>
      </div>
    </div>
  );
}
