import "server-only";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { searchProductsStructured } from "./product-search";
import { isAiFeatureEnabled } from "@/lib/integrations/ai/config";
import { z } from "zod";

export type AiCollection = {
  id: string;
  name: string;
  description: string | null;
  source: string;
  created_at: string;
  items?: { product_id: string; sort_order: number; note: string | null }[];
};

export async function listCollections(userId: string): Promise<AiCollection[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_collections")
    .select("id, name, description, source, created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as AiCollection[]) ?? [];
}

export async function getCollection(userId: string, collectionId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: col } = await supabase
    .from("ai_collections")
    .select("*")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!col) return null;

  const { data: items } = await supabase
    .from("ai_collection_items")
    .select("product_id, sort_order, note")
    .eq("collection_id", collectionId)
    .order("sort_order");

  return { ...(col as AiCollection), items: items ?? [] };
}

/**
 * Build a collection from real catalogue products matching a theme query.
 * Never invents products.
 */
export async function buildCollectionFromTheme(
  userId: string,
  theme: string
): Promise<AiCollection | null> {
  if (!isAiFeatureEnabled("AI_COLLECTION_BUILDER")) {
    return null;
  }

  const products = await searchProductsStructured({
    query: theme,
    limit: 6,
  });

  if (products.length === 0) return null;

  const supabase = await createSupabaseServerClient();
  const name = theme.slice(0, 80) || "Collection";

  const { data: col, error } = await supabase
    .from("ai_collections")
    .insert({
      user_id: userId,
      name,
      description: `Inspired by: ${theme.slice(0, 200)}`,
      source: "ai",
    })
    .select("*")
    .single();

  if (error || !col) return null;

  const collectionId = (col as { id: string }).id;
  await supabase.from("ai_collection_items").insert(
    products.map((p, i) => ({
      collection_id: collectionId,
      product_id: p.id,
      sort_order: i,
    }))
  );

  return getCollection(userId, collectionId);
}

export async function renameCollection(
  userId: string,
  collectionId: string,
  name: string
) {
  const parsed = z.string().min(1).max(120).parse(name);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("ai_collections")
    .update({ name: parsed, updated_at: new Date().toISOString() })
    .eq("id", collectionId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteCollection(userId: string, collectionId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("ai_collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeCollectionItem(
  userId: string,
  collectionId: string,
  productId: string
) {
  const supabase = await createSupabaseServerClient();
  // Ownership via collection
  const { data: col } = await supabase
    .from("ai_collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!col) throw new Error("Collection not found");

  const { error } = await supabase
    .from("ai_collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("product_id", productId);
  if (error) throw error;
}
