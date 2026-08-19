"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { profileUpdateSchema, addressSchema } from "@/lib/validation/account";
import { z } from "zod";

export type AccountActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateProfileAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const user = await requireUser();
  const parsed = profileUpdateSchema.safeParse({
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return {
      error: "Please check your input.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { success: "Profile updated." };
}

export async function saveAddressAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "") || undefined;

  const parsed = addressSchema.safeParse({
    fullName: formData.get("fullName"),
    line1: formData.get("line1"),
    line2: formData.get("line2") || "",
    city: formData.get("city"),
    state: formData.get("state") || "",
    postalCode: formData.get("postalCode"),
    countryCode: String(formData.get("countryCode") ?? "US").toUpperCase(),
    phone: formData.get("phone") || "",
    isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "true",
  });

  if (!parsed.success) {
    return {
      error: "Please check the address fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createSupabaseServerClient();
  const row = {
    user_id: user.id,
    full_name: parsed.data.fullName,
    line1: parsed.data.line1,
    line2: parsed.data.line2 || null,
    city: parsed.data.city,
    state: parsed.data.state || null,
    postal_code: parsed.data.postalCode,
    country_code: parsed.data.countryCode,
    phone: parsed.data.phone || null,
    is_default: parsed.data.isDefault ?? false,
  };

  if (parsed.data.isDefault) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  if (id) {
    const { error } = await supabase
      .from("addresses")
      .update(row)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("addresses").insert(row);
    if (error) return { error: error.message };
  }

  revalidatePath("/account/addresses");
  return { success: "Address saved." };
}

export async function deleteAddressAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing address." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/account/addresses");
  return { success: "Address deleted." };
}

export async function setDefaultAddressAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing address." };

  const supabase = await createSupabaseServerClient();
  await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/account/addresses");
  return { success: "Default address updated." };
}

const wishlistSchema = z.object({ productId: z.string().uuid() });

export async function toggleWishlistAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const user = await requireUser();
  const parsed = wishlistSchema.safeParse({ productId: formData.get("productId") });
  if (!parsed.success) return { error: "Invalid product." };

  const supabase = await createSupabaseServerClient();

  let { data: wishlist } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!wishlist) {
    const { data, error } = await supabase
      .from("wishlists")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    wishlist = data;
  }

  const wishlistId = (wishlist as { id: string }).id;

  const { data: existing } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("wishlist_id", wishlistId)
    .eq("product_id", parsed.data.productId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlist_items").delete().eq("id", (existing as { id: string }).id);
    revalidatePath("/account/wishlist");
    return { success: "Removed from wishlist." };
  }

  const { error } = await supabase.from("wishlist_items").insert({
    wishlist_id: wishlistId,
    product_id: parsed.data.productId,
  });
  if (error) return { error: error.message };
  revalidatePath("/account/wishlist");
  return { success: "Added to wishlist." };
}
