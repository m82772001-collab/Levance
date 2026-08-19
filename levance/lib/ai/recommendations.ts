import "server-only";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { listProducts, type ProductListItem } from "@/lib/catalog/queries";
import { listMemories } from "./memory";
import { isAiFeatureEnabled } from "@/lib/integrations/ai/config";

/**
 * Hybrid recommendations from real catalogue only.
 * Explicit prefs + wishlist + recent views + category affinity.
 * Never invents product records.
 */
export async function getRecommendations(
  userId: string,
  limit = 8
): Promise<ProductListItem[]> {
  if (!isAiFeatureEnabled("AI_RECOMMENDATIONS")) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  // Wishlist product ids
  const { data: wishlist } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let wishlistProductIds: string[] = [];
  if (wishlist) {
    const { data: items } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("wishlist_id", (wishlist as { id: string }).id);
    wishlistProductIds = (items ?? []).map(
      (i) => (i as { product_id: string }).product_id
    );
  }

  // Recent views
  const { data: views } = await supabase
    .from("product_views")
    .select("product_id")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(20);

  const viewedIds = (views ?? []).map((v) => (v as { product_id: string }).product_id);

  // Style memories → search hints
  let searchHint: string | undefined;
  try {
    const memories = await listMemories(userId);
    const style = memories
      .filter((m) => m.category === "STYLE" || m.category === "EXPLICIT")
      .map((m) => m.value)
      .slice(0, 5);
    if (style.length) searchHint = style.join(" ");
  } catch {
    // tables may not exist yet
  }

  const exclude = new Set([...wishlistProductIds, ...viewedIds]);

  const { products } = await listProducts({
    search: searchHint,
    pageSize: limit + exclude.size,
    sort: "newest",
  });

  const filtered = products.filter((p) => !exclude.has(p.id)).slice(0, limit);

  // Fallback: newest catalogue if nothing matched
  if (filtered.length === 0) {
    const fallback = await listProducts({ pageSize: limit, sort: "newest" });
    return fallback.products;
  }

  return filtered;
}

export async function recordProductView(userId: string, productId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("product_views").insert({
      user_id: userId,
      product_id: productId,
    });
  } catch {
    // non-fatal
  }
}
