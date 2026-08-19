import Link from "next/link";
import { requireMonarchAccess } from "@/lib/ai/access";
import { getRecommendations } from "@/lib/ai/recommendations";
import { listCollections } from "@/lib/ai/collections";
import { listMemories } from "@/lib/ai/memory";
import { ConciergePanel } from "@/components/ai/concierge-panel";
import { VoiceStatus } from "@/components/ai/voice-status";
import { CollectionBuilder } from "@/components/ai/collection-builder";
import { ProductCard } from "@/components/storefront/product-card";
import {
  isAiProviderConfigured,
  isVoiceProviderConfigured,
} from "@/lib/integrations/ai/config";

export const metadata = {
  title: "Monarch Private Salon",
  robots: { index: false, follow: false },
};

export default async function MonarchPage() {
  const user = await requireMonarchAccess();

  const [recommendations, collections, memories] = await Promise.all([
    getRecommendations(user.id, 6).catch(() => []),
    listCollections(user.id).catch(() => []),
    listMemories(user.id).catch(() => []),
  ]);

  return (
    <div className="container-content py-12 md:py-20 space-y-16">
      <section className="max-w-2xl">
        <p className="eyebrow mb-4 text-champagne">Monarch Private Salon</p>
        <h1 className="font-display text-4xl md:text-6xl leading-tight">
          Your private LÉVANCE world.
        </h1>
        <p className="mt-6 text-neutral-400 max-w-lg">
          Invitation-only space for collections, archive, and the highest level of
          concierge service — still bound by the same security model as the rest of LÉVANCE.
        </p>
      </section>

      <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
        <div className="space-y-14">
          <section>
            <h2 className="font-display text-2xl text-champagne mb-6">Private Picks</h2>
            {recommendations.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Catalogue picks will appear from your real activity and preferences.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {recommendations.map((p) => (
                  <div key={p.id} className="rounded-lg overflow-hidden bg-obsidian-soft border border-white/10">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display text-2xl text-champagne mb-6">Private Collections</h2>
            {collections.length === 0 ? (
              <p className="text-sm text-neutral-500 mb-6">No private collections yet.</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 mb-8">
                {collections.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-white/10 bg-obsidian-soft p-5"
                  >
                    <h3 className="font-medium text-ivory">{c.name}</h3>
                    {c.description && (
                      <p className="mt-1 text-xs text-neutral-500">{c.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="[&_form]:bg-obsidian-soft [&_form]:border-white/10 [&_label]:text-neutral-300 [&_input]:bg-obsidian [&_input]:border-white/20 [&_input]:text-ivory">
              <CollectionBuilder />
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-champagne mb-6">Personal Archive</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/account/ai-memory"
                className="rounded-lg border border-white/10 bg-obsidian-soft p-6 hover:border-champagne/40 transition-colors"
              >
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
                  Style profile
                </p>
                <p className="font-display text-xl">
                  {memories.length} memor{memories.length === 1 ? "y" : "ies"}
                </p>
              </Link>
              <Link
                href="/account/wishlist"
                className="rounded-lg border border-white/10 bg-obsidian-soft p-6 hover:border-champagne/40 transition-colors"
              >
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
                  Wishlist
                </p>
                <p className="font-display text-xl">Saved pieces</p>
              </Link>
              <Link
                href="/account/orders"
                className="rounded-lg border border-white/10 bg-obsidian-soft p-6 hover:border-champagne/40 transition-colors"
              >
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
                  Purchases
                </p>
                <p className="font-display text-xl">Order history</p>
              </Link>
              <div className="rounded-lg border border-white/10 bg-obsidian-soft p-6">
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
                  Early access
                </p>
                <p className="text-sm text-neutral-400">
                  Exclusive drops appear here when published — never fabricated events.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <ConciergePanel
            context="monarch"
            configured={isAiProviderConfigured()}
            voiceConfigured={isVoiceProviderConfigured()}
          />
          <VoiceStatus configured={isVoiceProviderConfigured()} />
        </aside>
      </div>
    </div>
  );
}
