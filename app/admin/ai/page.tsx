import {
  getAiProviderName,
  getAiModel,
  isAiFeatureEnabled,
  isAiProviderConfigured,
  isVoiceProviderConfigured,
} from "@/lib/integrations/ai/config";
import { getVoiceProviderStatus } from "@/lib/integrations/ai/provider";

export const metadata = { title: "AI — Admin" };

const FLAGS = [
  "AI_CONCIERGE",
  "AI_MEMORY",
  "AI_RECOMMENDATIONS",
  "AI_VOICE",
  "AI_COLLECTION_BUILDER",
  "AI_VISUAL_SEARCH",
] as const;

export default function AdminAiPage() {
  const providerConfigured = isAiProviderConfigured();
  const voice = getVoiceProviderStatus();

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow mb-2">Admin</p>
        <h1 className="font-display text-3xl">AI system</h1>
        <p className="mt-2 text-sm text-neutral-600 max-w-xl">
          Configuration status only. Private customer conversations and memories are not
          listed here — access to individual customer AI data requires controlled, audited
          processes outside this overview.
        </p>
      </div>

      <dl className="rounded-lg border border-neutral-200 bg-white divide-y divide-neutral-100">
        <div className="flex justify-between px-5 py-4 text-sm">
          <dt className="text-neutral-600">AI provider</dt>
          <dd className={providerConfigured ? "text-success" : "text-neutral-500"}>
            {providerConfigured
              ? `${getAiProviderName()} · model ${getAiModel() || "(unset)"}`
              : "Not configured"}
          </dd>
        </div>
        <div className="flex justify-between px-5 py-4 text-sm">
          <dt className="text-neutral-600">Voice provider</dt>
          <dd className={voice.configured ? "text-success" : "text-neutral-500"}>
            {voice.configured ? voice.provider : "Not configured"}
          </dd>
        </div>
      </dl>

      <section>
        <h2 className="font-display text-xl mb-4">Feature flags</h2>
        <ul className="rounded-lg border border-neutral-200 bg-white divide-y divide-neutral-100">
          {FLAGS.map((flag) => {
            const on = isAiFeatureEnabled(flag);
            return (
              <li key={flag} className="flex justify-between px-5 py-3 text-sm">
                <span className="font-mono text-xs">{flag}</span>
                <span className={on ? "text-success" : "text-neutral-400"}>
                  {on ? "Enabled" : "Disabled"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
