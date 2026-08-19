import "server-only";

import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { formatMoney, type ProductListItem } from "@/lib/catalog/queries";

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  trademark_disclaimer_text: string;
  is_authorized_reseller: boolean;
  supplier_source: string | null;
};

export async function listBrands(limit = 12): Promise<BrandRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url, description, trademark_disclaimer_text, is_authorized_reseller, supplier_source")
    .order("name")
    .limit(limit);

  if (error) throw error;
  return (data as BrandRow[]) ?? [];
}

export async function getBrandBySlug(slug: string): Promise<BrandRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url, description, trademark_disclaimer_text, is_authorized_reseller, supplier_source")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) notFound();
  return data as BrandRow;
}

export async function getBrandByName(name: string): Promise<BrandRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url, description, trademark_disclaimer_text, is_authorized_reseller, supplier_source")
    .ilike("name", name)
    .maybeSingle();

  if (error) throw error;
  return (data as BrandRow | null) ?? null;
}

export async function listProductsByBrand(brandId: string, pageSize = 12): Promise<ProductListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, name, brand, category_id, is_active, created_at")
    .eq("brand_id", brandId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(Math.min(48, Math.max(1, pageSize)));

  if (error) throw error;
  const rows = (products ?? []) as {
    id: string;
    slug: string;
    name: string;
    brand: string | null;
    category_id: string | null;
    is_active: boolean;
  }[];
  if (!rows.length) return [];

  const ids = rows.map((p) => p.id);
  const [{ data: variants }, { data: images }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("product_id, price_cents, compare_at_price_cents, currency, is_active")
      .in("product_id", ids)
      .eq("is_active", true),
    supabase
      .from("product_images")
      .select("product_id, url, alt_text, sort_order")
      .in("product_id", ids)
      .order("sort_order", { ascending: true }),
  ]);

  const priceMap = new Map<string, { min: number; compare: number | null; currency: string }>();
  for (const variant of variants ?? []) {
    const row = variant as {
      product_id: string;
      price_cents: number;
      compare_at_price_cents: number | null;
      currency: string;
    };
    const current = priceMap.get(row.product_id);
    if (!current || row.price_cents < current.min) {
      priceMap.set(row.product_id, {
        min: row.price_cents,
        compare: row.compare_at_price_cents,
        currency: row.currency || "USD",
      });
    }
  }

  const imageMap = new Map<string, { url: string; alt: string | null }>();
  for (const image of images ?? []) {
    const row = image as { product_id: string; url: string; alt_text: string | null };
    if (!imageMap.has(row.product_id)) imageMap.set(row.product_id, { url: row.url, alt: row.alt_text });
  }

  return rows.map((product) => {
    const price = priceMap.get(product.id);
    const image = imageMap.get(product.id);
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      category_id: product.category_id,
      is_active: product.is_active,
      min_price_cents: price?.min ?? null,
      compare_at_cents: price?.compare ?? null,
      image_url: image?.url ?? null,
      image_alt: image?.alt ?? null,
      currency: price?.currency ?? "USD",
    };
  });
}

export { formatMoney };
