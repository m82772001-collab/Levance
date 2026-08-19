import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { getCurrentUser } from "@/lib/auth/session";
import { randomUUID } from "crypto";

const GUEST_COOKIE = "levance_guest_cart";

export type CartLine = {
  id: string;
  variant_id: string;
  quantity: number;
  product_name: string;
  product_slug: string;
  sku: string;
  attributes: Record<string, string>;
  unit_price_cents: number;
  currency: string;
  image_url: string | null;
  quantity_available: number;
};

async function getOrCreateAuthCart(userId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from("carts").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data, error } = await supabase.from("carts").insert({ user_id: userId }).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

async function getOrCreateGuestCart(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(GUEST_COOKIE)?.value;
  const admin = createSupabaseAdminClient();

  if (token) {
    const { data } = await admin.from("carts").select("id").eq("guest_token", token).maybeSingle();
    if (data) return (data as { id: string }).id;
  }

  token = randomUUID();
  const { data, error } = await admin.from("carts").insert({ guest_token: token }).select("id").single();
  if (error) throw error;

  cookieStore.set(GUEST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return (data as { id: string }).id;
}

/**
 * Claims the current guest cart for the authenticated user. This is only
 * called after Supabase has established a real session. The guest token is
 * read from an HttpOnly cookie and is never accepted from client input.
 */
export async function claimGuestCart(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_COOKIE)?.value;
  if (!token) return;

  const admin = createSupabaseAdminClient();
  const { data: guestCart } = await admin.from("carts").select("id").eq("guest_token", token).maybeSingle();
  if (!guestCart) return;

  const guestCartId = (guestCart as { id: string }).id;
  const supabase = await createSupabaseServerClient();
  const authCartId = await getOrCreateAuthCart(userId);

  const { data: items, error: itemsError } = await admin
    .from("cart_items")
    .select("variant_id, quantity")
    .eq("cart_id", guestCartId);
  if (itemsError) throw itemsError;

  if (items?.length) {
    const { data: existing } = await supabase.from("cart_items").select("variant_id, quantity").eq("cart_id", authCartId);
    const quantities = new Map<string, number>();
    for (const item of existing ?? []) quantities.set((item as { variant_id: string }).variant_id, (item as { quantity: number }).quantity);

    for (const item of items) {
      const row = item as { variant_id: string; quantity: number };
      const quantity = (quantities.get(row.variant_id) ?? 0) + row.quantity;
      const { error } = await supabase.from("cart_items").upsert(
        { cart_id: authCartId, variant_id: row.variant_id, quantity },
        { onConflict: "cart_id,variant_id" }
      );
      if (error) throw error;
    }
  }

  await admin.from("carts").delete().eq("id", guestCartId).eq("guest_token", token);
  cookieStore.delete(GUEST_COOKIE);
}

export async function resolveCartId(): Promise<{ cartId: string; userId: string | null }> {
  const user = await getCurrentUser();
  if (user) {
    const cartId = await getOrCreateAuthCart(user.id);
    return { cartId, userId: user.id };
  }
  const cartId = await getOrCreateGuestCart();
  return { cartId, userId: null };
}

export async function getCartLines(): Promise<{
  lines: CartLine[];
  subtotal_cents: number;
  currency: string;
}> {
  const { cartId, userId } = await resolveCartId();
  const client = userId ? await createSupabaseServerClient() : createSupabaseAdminClient();

  const { data: items, error } = await client.from("cart_items").select("id, variant_id, quantity").eq("cart_id", cartId);
  if (error) throw error;
  if (!items?.length) return { lines: [], subtotal_cents: 0, currency: "USD" };

  const variantIds = items.map((i) => (i as { variant_id: string }).variant_id);
  const supabase = await createSupabaseServerClient();
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, sku, attributes, price_cents, currency, is_active, product_id, products(name, slug), inventory(quantity_available)")
    .in("id", variantIds);

  const productIds = [...new Set((variants ?? []).map((v) => (v as { product_id: string }).product_id))];
  const { data: images } = await supabase.from("product_images").select("product_id, url, sort_order").in("product_id", productIds).order("sort_order", { ascending: true });
  const imageMap = new Map<string, string>();
  for (const img of images ?? []) {
    const row = img as { product_id: string; url: string };
    if (!imageMap.has(row.product_id)) imageMap.set(row.product_id, row.url);
  }

  const variantMap = new Map<string, Record<string, unknown>>();
  for (const v of variants ?? []) variantMap.set((v as { id: string }).id, v as Record<string, unknown>);

  const lines: CartLine[] = [];
  let subtotal = 0;
  let currency = "USD";
  for (const item of items) {
    const row = item as { id: string; variant_id: string; quantity: number };
    const v = variantMap.get(row.variant_id);
    if (!v || !v.is_active) continue;
    const product = v.products as { name: string; slug: string } | null;
    const inv = v.inventory as { quantity_available: number } | { quantity_available: number }[] | null;
    const qtyAvailable = Array.isArray(inv) ? inv[0]?.quantity_available ?? 0 : inv?.quantity_available ?? 0;
    const unit = v.price_cents as number;
    subtotal += unit * row.quantity;
    currency = (v.currency as string) || "USD";
    lines.push({
      id: row.id,
      variant_id: row.variant_id,
      quantity: row.quantity,
      product_name: product?.name ?? "Product",
      product_slug: product?.slug ?? "",
      sku: v.sku as string,
      attributes: (v.attributes as Record<string, string>) ?? {},
      unit_price_cents: unit,
      currency,
      image_url: imageMap.get(v.product_id as string) ?? null,
      quantity_available: qtyAvailable,
    });
  }
  return { lines, subtotal_cents: subtotal, currency };
}
