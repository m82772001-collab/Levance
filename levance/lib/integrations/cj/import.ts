import "server-only";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { getProduct, getVariants, getInventory } from "./index";
import { calculateSellPriceCents, parseCjPriceToCents, getDefaultMarkup } from "./pricing";
import { writeCjSyncLog } from "./sync-log";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || `cj-${Date.now()}`
  );
}

/**
 * Import a CJ product into LÉVANCE catalogue as draft (is_active=false by default).
 * Does not overwrite existing LÉVANCE merchandising fields on re-import of mapping.
 */
export async function importCjProduct(params: {
  cjProductId: string;
  categoryId?: string | null;
  publish?: boolean;
  markupPercent?: number;
}): Promise<{ productId: string; variantCount: number }> {
  const admin = createSupabaseAdminClient();
  const cjProduct = await getProduct(params.cjProductId);
  const variants = await getVariants(params.cjProductId);

  const name =
    (cjProduct.productNameEn as string) ||
    (cjProduct.productName as string) ||
    `CJ ${params.cjProductId}`;
  const slug = slugify(name) + "-" + params.cjProductId.slice(-6);

  // Upsert cj_products raw
  await admin.from("cj_products").upsert({
    cj_product_id: params.cjProductId,
    raw: cjProduct,
    last_synced_at: new Date().toISOString(),
  });

  // Existing mapping?
  const { data: existingMap } = await admin
    .from("cj_products")
    .select("product_id")
    .eq("cj_product_id", params.cjProductId)
    .maybeSingle();

  let productId = (existingMap as { product_id: string | null } | null)?.product_id;

  if (productId) {
    // Refresh non-merchandising linkage only — do not clobber title/description/price policy
    await admin
      .from("products")
      .update({
        cj_product_id: params.cjProductId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);
  } else {
    const { data: product, error } = await admin
      .from("products")
      .insert({
        slug,
        name,
        description: null,
        category_id: params.categoryId ?? null,
        brand: "LÉVANCE",
        is_active: params.publish === true,
        cj_product_id: params.cjProductId,
      })
      .select("id")
      .single();
    if (error || !product) throw new Error(error?.message ?? "Product insert failed");
    productId = (product as { id: string }).id;

    await admin
      .from("cj_products")
      .update({ product_id: productId })
      .eq("cj_product_id", params.cjProductId);

    if (cjProduct.productImage) {
      await admin.from("product_images").insert({
        product_id: productId,
        url: String(cjProduct.productImage),
        alt_text: name,
        sort_order: 0,
      });
    }
  }

  const markup =
    params.markupPercent != null
      ? ({ type: "percent" as const, percent: params.markupPercent })
      : getDefaultMarkup();

  let variantCount = 0;
  for (const v of variants) {
    const vid = String(v.vid ?? "");
    if (!vid) continue;

    const costCents = parseCjPriceToCents(
      v.variantSellPrice ?? v.variantStandardPrice ?? cjProduct.productSellPrice
    );
    const sellCents = calculateSellPriceCents(costCents, markup);
    const sku = String(v.variantSku ?? `CJ-${vid}`).slice(0, 64);

    await admin.from("cj_variants").upsert({
      cj_variant_id: vid,
      cj_product_id: params.cjProductId,
      raw: v,
      last_synced_at: new Date().toISOString(),
    });

    const { data: existingVar } = await admin
      .from("cj_variants")
      .select("variant_id")
      .eq("cj_variant_id", vid)
      .maybeSingle();

    let variantId = (existingVar as { variant_id: string | null } | null)?.variant_id;

    if (!variantId) {
      const { data: created, error } = await admin
        .from("product_variants")
        .insert({
          product_id: productId,
          sku,
          attributes: {
            name: v.variantName ?? null,
          },
          price_cents: sellCents,
          compare_at_price_cents: null,
          currency: "USD",
          cj_variant_id: vid,
          is_active: true,
        })
        .select("id")
        .single();
      if (error || !created) continue;
      variantId = (created as { id: string }).id;
      await admin
        .from("cj_variants")
        .update({ variant_id: variantId })
        .eq("cj_variant_id", vid);
    }

    // Inventory
    try {
      const inv = await getInventory(vid);
      const qty = Number(inv.quantity ?? 0);
      await admin.from("cj_inventory").upsert({
        cj_variant_id: vid,
        quantity_available: Math.max(0, qty),
        warehouse: inv.storageName ? String(inv.storageName) : null,
        last_synced_at: new Date().toISOString(),
      });
      await admin.from("inventory").upsert(
        {
          variant_id: variantId,
          quantity_available: Math.max(0, qty),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "variant_id" }
      );
    } catch {
      // inventory optional at import time
    }

    variantCount++;
  }

  await writeCjSyncLog({
    sync_type: "product_import",
    status: "success",
    message: `Imported ${params.cjProductId} → ${productId}`,
    metadata: { cjProductId: params.cjProductId, productId, variantCount },
  });

  return { productId, variantCount };
}
