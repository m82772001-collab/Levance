"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { resolveCartId } from "./service";
import { z } from "zod";

const addSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(99),
});

const updateSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).max(99),
});

export type CartActionState = { error?: string; success?: string };

export async function addToCartAction(
  _prev: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const parsed = addSchema.safeParse({
    variantId: formData.get("variantId"),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) {
    return { error: "Invalid product or quantity." };
  }

  const { variantId, quantity } = parsed.data;

  // Authoritative inventory + price check
  const supabase = await createSupabaseServerClient();
  const { data: variant } = await supabase
    .from("product_variants")
    .select("id, is_active, inventory(quantity_available)")
    .eq("id", variantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!variant) {
    return { error: "This product variant is unavailable." };
  }

  const inv = (variant as { inventory: { quantity_available: number } | { quantity_available: number }[] | null }).inventory;
  const available = Array.isArray(inv)
    ? inv[0]?.quantity_available ?? 0
    : inv?.quantity_available ?? 0;

  if (available < quantity) {
    return { error: available === 0 ? "Out of stock." : `Only ${available} available.` };
  }

  const { cartId, userId } = await resolveCartId();
  const client = userId
    ? await createSupabaseServerClient()
    : createSupabaseAdminClient();

  const { data: existing } = await client
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variantId)
    .maybeSingle();

  if (existing) {
    const newQty = (existing as { quantity: number }).quantity + quantity;
    if (newQty > available) {
      return { error: `Only ${available} available.` };
    }
    const { error } = await client
      .from("cart_items")
      .update({ quantity: newQty })
      .eq("id", (existing as { id: string }).id);
    if (error) return { error: error.message };
  } else {
    const { error } = await client.from("cart_items").insert({
      cart_id: cartId,
      variant_id: variantId,
      quantity,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/cart");
  revalidatePath("/");
  return { success: "Added to cart." };
}

export async function updateCartItemAction(
  _prev: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const parsed = updateSchema.safeParse({
    itemId: formData.get("itemId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { error: "Invalid update." };

  const { itemId, quantity } = parsed.data;
  const { cartId, userId } = await resolveCartId();
  const client = userId
    ? await createSupabaseServerClient()
    : createSupabaseAdminClient();

  // Ownership: item must belong to this cart
  const { data: item } = await client
    .from("cart_items")
    .select("id, variant_id, cart_id")
    .eq("id", itemId)
    .eq("cart_id", cartId)
    .maybeSingle();

  if (!item) return { error: "Item not found in your cart." };

  if (quantity === 0) {
    const { error } = await client.from("cart_items").delete().eq("id", itemId);
    if (error) return { error: error.message };
  } else {
    const supabase = await createSupabaseServerClient();
    const { data: variant } = await supabase
      .from("product_variants")
      .select("inventory(quantity_available)")
      .eq("id", (item as { variant_id: string }).variant_id)
      .maybeSingle();

    const inv = (variant as { inventory: { quantity_available: number } | { quantity_available: number }[] | null } | null)?.inventory;
    const available = Array.isArray(inv)
      ? inv[0]?.quantity_available ?? 0
      : inv?.quantity_available ?? 0;

    if (quantity > available) {
      return { error: `Only ${available} available.` };
    }

    const { error } = await client
      .from("cart_items")
      .update({ quantity })
      .eq("id", itemId);
    if (error) return { error: error.message };
  }

  revalidatePath("/cart");
  return { success: "Cart updated." };
}

export async function removeCartItemAction(
  _prev: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { error: "Missing item." };

  const { cartId, userId } = await resolveCartId();
  const client = userId
    ? await createSupabaseServerClient()
    : createSupabaseAdminClient();

  const { error } = await client
    .from("cart_items")
    .delete()
    .eq("id", itemId)
    .eq("cart_id", cartId);

  if (error) return { error: error.message };
  revalidatePath("/cart");
  return { success: "Removed." };
}
