import "server-only";
import { getAiProvider } from "@/lib/integrations/ai/provider";
import {
  getAiQuota,
  isAiFeatureEnabled,
  isAiProviderConfigured,
} from "@/lib/integrations/ai/config";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { buildMemoryContext } from "./memory";
import {
  parseNaturalLanguageQuery,
  searchProductsStructured,
} from "./product-search";
import { formatMoney, type ProductListItem } from "@/lib/catalog/queries";
import type { MembershipTier } from "@/lib/membership/types";
import type { ChatMessage } from "@/lib/integrations/ai/types";

const SYSTEM_BASE = `You are the LÉVANCE private shopping concierge.
You help with product discovery using ONLY products provided in the context.
Never invent products, prices, inventory, discounts, reviews, or order status.
If information is missing, say it is unavailable.
Never grant membership, change permissions, or claim payment success.
Be elegant, concise, and helpful — luxury private shopping tone.`;

export type ConciergeResult = {
  reply: string;
  products: ProductListItem[];
  configured: boolean;
  error?: string;
};

async function checkQuota(userId: string, tier: MembershipTier): Promise<boolean> {
  const quota = getAiQuota(tier);
  if (quota.dailyRequests <= 0) return false;

  const supabase = await createSupabaseServerClient();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  return (count ?? 0) < quota.dailyRequests;
}

async function recordUsage(
  userId: string,
  feature: string,
  tokensIn = 0,
  tokensOut = 0
) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("ai_usage").insert({
      user_id: userId,
      feature,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    });
  } catch {
    // non-fatal if migration not applied
  }
}

export async function runConcierge(params: {
  userId: string;
  tier: MembershipTier;
  message: string;
  conversationId?: string;
  context: "showroom" | "monarch";
}): Promise<ConciergeResult> {
  if (!isAiFeatureEnabled("AI_CONCIERGE")) {
    return {
      reply: "The AI concierge is not enabled for this environment.",
      products: [],
      configured: false,
    };
  }

  if (!(await checkQuota(params.userId, params.tier))) {
    return {
      reply: "You have reached today’s concierge request limit for your membership.",
      products: [],
      configured: true,
      error: "quota",
    };
  }

  // Always ground in real catalogue search first
  const structured = parseNaturalLanguageQuery(params.message);
  let products: ProductListItem[] = [];
  try {
    products = await searchProductsStructured(structured);
  } catch {
    products = [];
  }

  const productContext =
    products.length > 0
      ? products
          .map(
            (p, i) =>
              `${i + 1}. ${p.name}${p.brand ? ` (${p.brand})` : ""} — ${
                p.min_price_cents != null
                  ? formatMoney(p.min_price_cents, p.currency)
                  : "price unavailable"
              } — /product/${p.slug}`
          )
          .join("\n")
      : "No matching products found in the LÉVANCE catalogue for this request.";

  let memoryBlock = "";
  try {
    memoryBlock = await buildMemoryContext(params.userId);
  } catch {
    memoryBlock = "";
  }

  const systemPrompt = [
    SYSTEM_BASE,
    params.context === "monarch"
      ? "This guest is a MONARCH member — offer the highest level of personal service within policy."
      : "This guest is a PREMIUM member in the Private Showroom.",
    memoryBlock ? `Known preferences:\n${memoryBlock}` : "",
    `Catalogue results for this turn:\n${productContext}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!isAiProviderConfigured()) {
    // Elegant offline mode: return real products with a clear non-AI message
    await recordUsage(params.userId, "concierge_offline");
    const reply =
      products.length > 0
        ? `I found ${products.length} piece${products.length === 1 ? "" : "s"} from the LÉVANCE catalogue that may suit your request. The full conversational concierge activates once an AI provider is configured.`
        : "No matching pieces were found in the catalogue for that request. The full conversational concierge activates once an AI provider is configured.";

    return { reply, products, configured: false };
  }

  const provider = getAiProvider();
  const quota = getAiQuota(params.tier);

  try {
    const history = await loadRecentMessages(params.conversationId, params.userId);
    const messages: ChatMessage[] = [
      ...history,
      { role: "user", content: params.message },
    ];

    const result = await provider.chat({
      messages,
      systemPrompt,
      maxTokens: quota.maxTokensPerRequest,
      temperature: 0.4,
    });

    await recordUsage(
      params.userId,
      "concierge",
      result.tokensIn ?? 0,
      result.tokensOut ?? 0
    );

    if (params.conversationId) {
      await appendMessage(params.conversationId, params.userId, "user", params.message);
      await appendMessage(
        params.conversationId,
        params.userId,
        "assistant",
        result.content
      );
    }

    return { reply: result.content, products, configured: true };
  } catch (e) {
    return {
      reply:
        products.length > 0
          ? `I could not complete a full concierge reply, but here are catalogue matches for your request.`
          : e instanceof Error
            ? e.message
            : "Concierge temporarily unavailable.",
      products,
      configured: true,
      error: e instanceof Error ? e.message : "error",
    };
  }
}

async function loadRecentMessages(
  conversationId: string | undefined,
  userId: string
): Promise<ChatMessage[]> {
  if (!conversationId) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!conv) return [];

    const { data } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    return ((data ?? []) as { role: string; content: string }[])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  } catch {
    return [];
  }
}

async function appendMessage(
  conversationId: string,
  userId: string,
  role: "user" | "assistant",
  content: string
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!conv) return;
    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role,
      content,
    });
  } catch {
    // non-fatal
  }
}

export async function ensureConversation(
  userId: string,
  context: "showroom" | "monarch"
): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: userId,
        context,
        title: context === "monarch" ? "Salon" : "Showroom",
      })
      .select("id")
      .single();
    if (error) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}
