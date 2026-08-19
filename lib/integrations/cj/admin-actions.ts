"use server";

import { requireAdmin } from "@/lib/auth/rbac";
import { searchProducts, verifyCjConnection } from "./index";
import { importCjProduct } from "./import";
import { fulfillPaidOrder, syncTrackingForOrder } from "./fulfillment";
import { writeCjSyncLog } from "./sync-log";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { getInventory } from "./index";

export type CjAdminState = {
  error?: string;
  success?: string;
  products?: {
    pid: string;
    name: string;
    image?: string;
    price?: string;
  }[];
};

export async function cjSearchAction(
  _prev: CjAdminState,
  formData: FormData
): Promise<CjAdminState> {
  await requireAdmin();
  const q = String(formData.get("query") ?? "").trim();
  if (!q) return { error: "Enter a search query." };
  try {
    const list = await searchProducts(q, { pageSize: 20 });
    return {
      products: list.map((p) => ({
        pid: p.pid,
        name: String(p.productNameEn || p.productName || p.pid),
        image: p.productImage ? String(p.productImage) : undefined,
        price:
          p.productSellPrice != null ? String(p.productSellPrice) : undefined,
      })),
      success: `${list.length} result(s)`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Search failed" };
  }
}

export async function cjImportAction(
  _prev: CjAdminState,
  formData: FormData
): Promise<CjAdminState> {
  await requireAdmin();
  const pid = String(formData.get("pid") ?? "").trim();
  const publish = formData.get("publish") === "on";
  const categoryId = String(formData.get("categoryId") ?? "") || undefined;
  const markup = formData.get("markupPercent")
    ? Number(formData.get("markupPercent"))
    : undefined;
  if (!pid) return { error: "Missing product id." };
  try {
    const result = await importCjProduct({
      cjProductId: pid,
      categoryId,
      publish,
      markupPercent: markup,
    });
    return {
      success: `Imported as product ${result.productId} (${result.variantCount} variants). ${publish ? "Published." : "Saved as draft."}`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Import failed" };
  }
}

export async function cjRetryFulfillmentAction(
  _prev: CjAdminState,
  formData: FormData
): Promise<CjAdminState> {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Missing order id." };
  const result = await fulfillPaidOrder(orderId);
  if (!result.ok) return { error: result.error ?? "Fulfillment failed" };
  return { success: result.cjOrderId ? `CJ order ${result.cjOrderId}` : "OK" };
}

export async function cjSyncInventoryAction(): Promise<CjAdminState> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data: variants } = await admin
    .from("cj_variants")
    .select("cj_variant_id, variant_id")
    .not("variant_id", "is", null)
    .limit(50);

  let ok = 0;
  let fail = 0;
  for (const row of variants ?? []) {
    const r = row as { cj_variant_id: string; variant_id: string };
    try {
      const inv = await getInventory(r.cj_variant_id);
      const qty = Math.max(0, Number(inv.quantity ?? 0));
      await admin.from("cj_inventory").upsert({
        cj_variant_id: r.cj_variant_id,
        quantity_available: qty,
        last_synced_at: new Date().toISOString(),
      });
      await admin
        .from("inventory")
        .upsert(
          {
            variant_id: r.variant_id,
            quantity_available: qty,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "variant_id" }
        );
      ok++;
    } catch {
      fail++;
    }
  }
  await writeCjSyncLog({
    sync_type: "inventory_manual",
    status: fail ? "partial" : "success",
    message: `Synced ${ok} ok, ${fail} failed`,
  });
  return { success: `Inventory sync: ${ok} ok, ${fail} failed` };
}

export async function cjConnectionStatusAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  await requireAdmin();
  return verifyCjConnection();
}
