import "server-only";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getCartLines, resolveCartId } from "@/lib/cart/service";
import { getCurrentUser } from "@/lib/auth/session";
import { randomBytes } from "crypto";

export type PreparedOrder = {
  orderId: string;
  orderNumber: string;
  total_cents: number;
  currency: string;
  lineCount: number;
};

/**
 * Server-side order preparation:
 * - Revalidates variants & inventory
 * - Recalculates prices from DB (never trusts client totals)
 * - Creates order + order_items via service role
 * Does NOT mark paid — that happens only via verified Stripe webhook.
 */
export async function prepareOrderFromCart(input: {
  shippingAddress: {
    full_name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country_code: string;
    phone?: string;
  };
  email: string;
}): Promise<PreparedOrder> {
  const user = await getCurrentUser();
  const { lines } = await getCartLines();
  if (lines.length === 0) {
    throw new Error("Cart is empty.");
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  // Revalidate each line against live inventory & price
  let subtotal = 0;
  const validated: {
    variant_id: string;
    product_name: string;
    unit_price_cents: number;
    quantity: number;
  }[] = [];

  for (const line of lines) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("id, price_cents, is_active, products(name), inventory(quantity_available)")
      .eq("id", line.variant_id)
      .maybeSingle();

    if (!variant || !(variant as { is_active: boolean }).is_active) {
      throw new Error(`Variant unavailable: ${line.product_name}`);
    }

    const inv = (variant as { inventory: { quantity_available: number } | { quantity_available: number }[] | null }).inventory;
    const available = Array.isArray(inv)
      ? inv[0]?.quantity_available ?? 0
      : inv?.quantity_available ?? 0;

    if (line.quantity > available) {
      throw new Error(`Insufficient stock for ${line.product_name}`);
    }

    const unit = (variant as { price_cents: number }).price_cents;
    const product = (variant as { products: { name: string } | null }).products;
    subtotal += unit * line.quantity;
    validated.push({
      variant_id: line.variant_id,
      product_name: product?.name ?? line.product_name,
      unit_price_cents: unit,
      quantity: line.quantity,
    });
  }

  const shipping_cents = 0; // shipping calculation deferred
  const total_cents = subtotal + shipping_cents;
  const orderNumber = `LV-${randomBytes(4).toString("hex").toUpperCase()}`;

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id: user?.id ?? null,
      order_number: orderNumber,
      status: "awaiting_payment",
      subtotal_cents: subtotal,
      shipping_cents,
      total_cents,
      currency: lines[0]?.currency ?? "USD",
      shipping_address: input.shippingAddress,
    })
    .select("id, order_number")
    .single();

  if (error || !order) {
    throw new Error(error?.message ?? "Failed to create order");
  }

  const orderId = (order as { id: string }).id;

  const { error: itemsError } = await admin.from("order_items").insert(
    validated.map((v) => ({
      order_id: orderId,
      variant_id: v.variant_id,
      product_name_snapshot: v.product_name,
      unit_price_cents: v.unit_price_cents,
      quantity: v.quantity,
    }))
  );

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  // Clear cart items after successful order prep
  const { cartId, userId } = await resolveCartId();
  const cartClient = userId ? supabase : admin;
  await cartClient.from("cart_items").delete().eq("cart_id", cartId);

  return {
    orderId,
    orderNumber: (order as { order_number: string }).order_number,
    total_cents,
    currency: lines[0]?.currency ?? "USD",
    lineCount: validated.length,
  };
}
