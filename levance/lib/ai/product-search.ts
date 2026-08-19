import "server-only";
import { listProducts, type ProductListItem } from "@/lib/catalog/queries";
import { listCategories } from "@/lib/catalog/queries";
import type { StructuredProductSearch } from "@/lib/integrations/ai/types";
import { z } from "zod";

/**
 * Controlled catalogue search — AI never generates SQL.
 * Structured params → validated → Supabase via existing catalog layer.
 */

const searchSchema = z.object({
  query: z.string().max(200).optional(),
  categorySlugs: z.array(z.string().max(80)).max(10).optional(),
  colors: z.array(z.string().max(40)).max(10).optional(),
  styles: z.array(z.string().max(40)).max(10).optional(),
  maxPriceCents: z.number().int().min(0).max(10_000_000).optional(),
  minPriceCents: z.number().int().min(0).max(10_000_000).optional(),
  limit: z.number().int().min(1).max(24).optional(),
});

export async function searchProductsStructured(
  raw: StructuredProductSearch
): Promise<ProductListItem[]> {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) {
    return [];
  }

  const params = parsed.data;
  let categoryId: string | undefined;

  if (params.categorySlugs?.length) {
    const categories = await listCategories();
    const match = categories.find((c) =>
      params.categorySlugs!.some(
        (s) => s.toLowerCase() === c.slug.toLowerCase() || s.toLowerCase() === c.name.toLowerCase()
      )
    );
    categoryId = match?.id;
  }

  // Fold style/color hints into text search when present
  const textParts = [
    params.query,
    ...(params.colors ?? []),
    ...(params.styles ?? []),
  ].filter(Boolean);

  const { products } = await listProducts({
    search: textParts.length ? textParts.join(" ") : undefined,
    categoryId,
    minPriceCents: params.minPriceCents,
    maxPriceCents: params.maxPriceCents,
    pageSize: params.limit ?? 8,
    sort: "newest",
  });

  return products;
}

/**
 * Heuristic NL → structured params (no LLM required).
 * Used when AI provider is offline or as a first-pass parser.
 */
export function parseNaturalLanguageQuery(text: string): StructuredProductSearch {
  const lower = text.toLowerCase();
  const result: StructuredProductSearch = { query: text, limit: 8 };

  const priceMatch = lower.match(/under\s*\$?\s*(\d+)/) || lower.match(/below\s*\$?\s*(\d+)/);
  if (priceMatch) {
    result.maxPriceCents = Number(priceMatch[1]) * 100;
  }

  const colors = ["black", "white", "ivory", "gold", "silver", "brown", "navy", "beige", "cream"];
  result.colors = colors.filter((c) => lower.includes(c));

  const styles = ["elegant", "minimal", "minimalist", "luxury", "casual", "classic", "modern"];
  result.styles = styles.filter((s) => lower.includes(s));

  const cats = ["fashion", "beauty", "tech", "accessories", "home", "lifestyle"];
  result.categorySlugs = cats.filter((c) => lower.includes(c));

  return result;
}
