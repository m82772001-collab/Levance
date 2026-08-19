import "server-only";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { notFound } from "next/navigation";

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category_id: string | null;
  is_active: boolean;
  min_price_cents: number | null;
  compare_at_cents: number | null;
  image_url: string | null;
  currency: string;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brand: string | null;
  category_id: string | null;
  is_active: boolean;
  images: { id: string; url: string; alt_text: string | null; sort_order: number }[];
  variants: {
    id: string;
    sku: string;
    attributes: Record<string, string>;
    price_cents: number;
    compare_at_price_cents: number | null;
    currency: string;
    is_active: boolean;
    quantity_available: number;
  }[];
};

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
};

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export { formatMoney };

export async function listCategories(): Promise<CategoryRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, parent_id")
    .order("name");
  if (error) throw error;
  return (data as CategoryRow[]) ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, parent_id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data as CategoryRow;
}

type ListProductsOpts = {
  categoryId?: string;
  search?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  page?: number;
  pageSize?: number;
};

export async function listProducts(opts: ListProductsOpts = {}): Promise<{
  products: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, opts.pageSize ?? 12));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  // Base product query (active only via RLS for non-admins)
  let query = supabase
    .from("products")
    .select("id, slug, name, brand, category_id, is_active, created_at", {
      count: "exact",
    })
    .eq("is_active", true);

  if (opts.categoryId) {
    query = query.eq("category_id", opts.categoryId);
  }
  if (opts.search?.trim()) {
    const q = opts.search.trim();
    query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%`);
  }

  switch (opts.sort) {
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data: products, error, count } = await query.range(from, to);
  if (error) throw error;

  const list = (products ?? []) as {
    id: string;
    slug: string;
    name: string;
    brand: string | null;
    category_id: string | null;
    is_active: boolean;
  }[];

  if (list.length === 0) {
    return { products: [], total: count ?? 0, page, pageSize };
  }

  const ids = list.map((p) => p.id);

  const [{ data: variants }, { data: images }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("product_id, price_cents, compare_at_price_cents, currency, is_active")
      .in("product_id", ids)
      .eq("is_active", true),
    supabase
      .from("product_images")
      .select("product_id, url, sort_order")
      .in("product_id", ids)
      .order("sort_order", { ascending: true }),
  ]);

  const priceMap = new Map<
    string,
    { min: number; compare: number | null; currency: string }
  >();
  for (const v of variants ?? []) {
    const row = v as {
      product_id: string;
      price_cents: number;
      compare_at_price_cents: number | null;
      currency: string;
    };
    const cur = priceMap.get(row.product_id);
    if (!cur || row.price_cents < cur.min) {
      priceMap.set(row.product_id, {
        min: row.price_cents,
        compare: row.compare_at_price_cents,
        currency: row.currency || "USD",
      });
    }
  }

  const imageMap = new Map<string, string>();
  for (const img of images ?? []) {
    const row = img as { product_id: string; url: string };
    if (!imageMap.has(row.product_id)) {
      imageMap.set(row.product_id, row.url);
    }
  }

  let result: ProductListItem[] = list.map((p) => {
    const price = priceMap.get(p.id);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category_id: p.category_id,
      is_active: p.is_active,
      min_price_cents: price?.min ?? null,
      compare_at_cents: price?.compare ?? null,
      image_url: imageMap.get(p.id) ?? null,
      currency: price?.currency ?? "USD",
    };
  });

  // Client-side price filter/sort when needed (variant prices not on products table)
  if (opts.minPriceCents != null) {
    result = result.filter(
      (p) => p.min_price_cents != null && p.min_price_cents >= opts.minPriceCents!
    );
  }
  if (opts.maxPriceCents != null) {
    result = result.filter(
      (p) => p.min_price_cents != null && p.min_price_cents <= opts.maxPriceCents!
    );
  }
  if (opts.sort === "price_asc") {
    result = [...result].sort(
      (a, b) => (a.min_price_cents ?? 0) - (b.min_price_cents ?? 0)
    );
  } else if (opts.sort === "price_desc") {
    result = [...result].sort(
      (a, b) => (b.min_price_cents ?? 0) - (a.min_price_cents ?? 0)
    );
  }

  return { products: result, total: count ?? result.length, page, pageSize };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const supabase = await createSupabaseServerClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("id, slug, name, description, brand, category_id, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!product) notFound();

  const p = product as {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    brand: string | null;
    category_id: string | null;
    is_active: boolean;
  };

  const [{ data: variants }, { data: images }, { data: inventory }] =
    await Promise.all([
      supabase
        .from("product_variants")
        .select(
          "id, sku, attributes, price_cents, compare_at_price_cents, currency, is_active"
        )
        .eq("product_id", p.id)
        .eq("is_active", true),
      supabase
        .from("product_images")
        .select("id, url, alt_text, sort_order")
        .eq("product_id", p.id)
        .order("sort_order", { ascending: true }),
      supabase.from("inventory").select("variant_id, quantity_available"),
    ]);

  const invMap = new Map<string, number>();
  for (const inv of inventory ?? []) {
    const row = inv as { variant_id: string; quantity_available: number };
    invMap.set(row.variant_id, row.quantity_available);
  }

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    brand: p.brand,
    category_id: p.category_id,
    is_active: p.is_active,
    images: (images as ProductDetail["images"]) ?? [],
    variants: ((variants ?? []) as {
      id: string;
      sku: string;
      attributes: Record<string, string>;
      price_cents: number;
      compare_at_price_cents: number | null;
      currency: string;
      is_active: boolean;
    }[]).map((v) => ({
      ...v,
      attributes: (v.attributes ?? {}) as Record<string, string>,
      quantity_available: invMap.get(v.id) ?? 0,
    })),
  };
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  limit = 4
): Promise<ProductListItem[]> {
  if (!categoryId) return [];
  const { products } = await listProducts({
    categoryId,
    pageSize: limit + 1,
    sort: "newest",
  });
  return products.filter((p) => p.id !== productId).slice(0, limit);
}

export async function getReviewsForProduct(productId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, title, body, created_at, user_id")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}
