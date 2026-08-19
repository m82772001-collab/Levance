import "server-only";

import { askClaude } from "@/lib/ai/claude";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

export type TrendTerm = { term: string; source?: string };

export async function matchTrends(trends: TrendTerm[]) {
  const supabase = await createSupabaseServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id,name,slug,description,brand,attributes")
    .eq("is_active", true)
    .limit(100);
  if (error) throw error;

  const result = await askClaude({
    system: `You score shopping-trend relevance for LÉVANCE. Return ONLY JSON in this shape: {"matches":[{"trend":"string","product_id":"uuid","score":0,"reason":"string"}]}. Score 0-100. Use only supplied products. Never invent product IDs.`,
    messages: [{
      role: "user",
      content: JSON.stringify({ trends, products: products ?? [] }),
    }],
    maxTokens: 1200,
  });

  const parsed = JSON.parse(result.text) as { matches?: Array<{ trend: string; product_id: string; score: number; reason: string }> };
  const validIds = new Set((products ?? []).map((product) => product.id));
  const matches = (parsed.matches ?? []).filter((match) => validIds.has(match.product_id));

  await supabase.from("trend_snapshots").insert({
    source: "manual_stand_in",
    terms: trends,
    raw_payload: { matches },
  });

  return matches;
}
