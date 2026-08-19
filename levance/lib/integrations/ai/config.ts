import "server-only";

/**
 * Feature flags and membership quotas for AI capabilities.
 * Disabled features must never present as operational.
 */

export type AiFeatureFlag =
  | "AI_CONCIERGE"
  | "AI_MEMORY"
  | "AI_RECOMMENDATIONS"
  | "AI_VOICE"
  | "AI_COLLECTION_BUILDER"
  | "AI_VISUAL_SEARCH";

const FLAG_ENV: Record<AiFeatureFlag, string> = {
  AI_CONCIERGE: "AI_FEATURE_CONCIERGE",
  AI_MEMORY: "AI_FEATURE_MEMORY",
  AI_RECOMMENDATIONS: "AI_FEATURE_RECOMMENDATIONS",
  AI_VOICE: "AI_FEATURE_VOICE",
  AI_COLLECTION_BUILDER: "AI_FEATURE_COLLECTION_BUILDER",
  AI_VISUAL_SEARCH: "AI_FEATURE_VISUAL_SEARCH",
};

/** true only when explicitly set to "true" or "1" */
export function isAiFeatureEnabled(flag: AiFeatureFlag): boolean {
  const raw = process.env[FLAG_ENV[flag]];
  if (raw === undefined || raw === "") {
    // Default: concierge/memory/recommendations/collection on when provider configured;
    // voice and visual search off until explicitly enabled.
    if (flag === "AI_VOICE" || flag === "AI_VISUAL_SEARCH") return false;
    return isAiProviderConfigured();
  }
  return raw === "true" || raw === "1";
}

export function isAiProviderConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY && process.env.AI_PROVIDER);
}

export function isVoiceProviderConfigured(): boolean {
  return Boolean(process.env.VOICE_API_KEY && process.env.VOICE_PROVIDER);
}

export type MembershipTierQuota = {
  dailyRequests: number;
  maxTokensPerRequest: number;
};

/** Configurable quotas by tier — not hard-coded business logic elsewhere */
export function getAiQuota(
  tier: "COMMON" | "PRO" | "PREMIUM" | "MONARCH"
): MembershipTierQuota {
  switch (tier) {
    case "MONARCH":
      return {
        dailyRequests: Number(process.env.AI_QUOTA_MONARCH_DAILY ?? 200),
        maxTokensPerRequest: Number(process.env.AI_QUOTA_MONARCH_TOKENS ?? 4096),
      };
    case "PREMIUM":
      return {
        dailyRequests: Number(process.env.AI_QUOTA_PREMIUM_DAILY ?? 50),
        maxTokensPerRequest: Number(process.env.AI_QUOTA_PREMIUM_TOKENS ?? 2048),
      };
    case "PRO":
      return {
        dailyRequests: Number(process.env.AI_QUOTA_PRO_DAILY ?? 10),
        maxTokensPerRequest: Number(process.env.AI_QUOTA_PRO_TOKENS ?? 1024),
      };
    default:
      return { dailyRequests: 0, maxTokensPerRequest: 0 };
  }
}

export function getAiProviderName(): string {
  return process.env.AI_PROVIDER ?? "none";
}

export function getAiModel(): string {
  return process.env.AI_MODEL ?? "";
}
