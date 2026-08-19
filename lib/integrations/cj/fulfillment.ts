import "server-only";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { createOrder, getTracking } from "./index";
import { writeCjSyncLog } from "./sync-log";
import type { CjCreateOrderInput } from "./types";

/**
 * After Stripe confirms payment: create CJ order if not already created (idempotent).
 * On failure: leave LÉVANCE order PAID and mark fulfillment needs attention.
 */
export async function fulfillPaidOrder(orderId: string): Promise<{
  ok: boolean;
  cjOrderId?: string;
  error?: string;
}> {
  const admin = createSupabaseAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found" };
  const o = order as {
    id: string;
    order_number: string;
    status: string;
    shipping_address: Record<string, string>;
  };

  if (o.status !== "paid" && o.status !== "fulfilling") {
    return { ok: false, error: `Order status is ${o.status}, expected paid` };
  }

  // Idempotency: existing cj_orders row
  const { data: existing } = await admin
    .from("cj_orders")
    .select("cj_order_id, id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing && (existing as { cj_order_id: string }).cj_order_id) {
    return {
      ok: true,
      cjOrderId: (existing as { cj_order_id: string }).cj_order_id,
    };
  }

  const { data: items } = await admin
    .from("order_items")
    .select("variant_id, quantity, product_name_snapshot")
    .eq("order_id", orderId);

  const products: CjCreateOrderInput["products"] = [];
  for (const item of items ?? []) {
    const row = item as {
      variant_id: string;
      quantity: number;
      product_name_snapshot: string;
    };
    const { data: variant } = await admin
      .from("product_variants")
      .select("cj_variant_id, sku")
      .eq("id", row.variant_id)
      .maybeSingle();

    const cjVid = (variant as { cj_variant_id: string | null } | null)?.cj_variant_id;
    const sku = (variant as { sku: string } | null)?.sku;

    if (!cjVid && !sku) {
      // Non-CJ line item — skip for supplier order
      continue;
    }

    products.push({
      vid: cjVid ?? undefined,
      sku: sku ?? undefined,
      quantity: row.quantity,
      storeProductName: row.product_name_snapshot,
    });
  }

  if (products.length === 0) {
    await writeCjSyncLog({
      sync_type: "order_fulfillment",
      status: "partial",
      message: `Order ${o.order_number} has no CJ-mapped variants`,
      metadata: { orderId },
    });
    return { ok: true }; // nothing to fulfill via CJ
  }

  const addr = o.shipping_address ?? {};

  try {
    const result = await createOrder({
      orderNumber: o.order_number,
      shippingCountryCode: (addr.country_code || "US").slice(0, 2),
      shippingCountry: addr.country_code || "US",
      shippingProvince: addr.state || addr.city || "N/A",
      shippingCity: addr.city || "N/A",
      shippingZip: addr.postal_code,
      shippingPhone: addr.phone,
      shippingCustomerName: addr.full_name,
      shippingAddress: addr.line1,
      shippingAddress2: addr.line2,
      products,
      orderFlow: 1,
    });

    const cjOrderId = String(
      result.orderId || result.orderNum || result.orderNumber || ""
    );

    await admin.from("cj_orders").upsert({
      order_id: orderId,
      cj_order_id: cjOrderId || `pending-${orderId}`,
      status: result.orderStatus || "CREATED",
      raw: result,
      last_synced_at: new Date().toISOString(),
    });

    await admin
      .from("orders")
      .update({ status: "fulfilling", updated_at: new Date().toISOString() })
      .eq("id", orderId);

    await writeCjSyncLog({
      sync_type: "order_fulfillment",
      status: "success",
      message: `CJ order created for ${o.order_number}`,
      metadata: { orderId, cjOrderId },
    });

    return { ok: true, cjOrderId: cjOrderId || undefined };
  } catch (e) {
    const message = e instanceof Error ? e.message : "CJ order creation failed";
    await writeCjSyncLog({
      sync_type: "order_fulfillment",
      status: "error",
      message,
      metadata: { orderId, orderNumber: o.order_number },
    });
    // Keep PAID — admin must retry
    await admin
      .from("orders")
      .update({
        status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return { ok: false, error: message };
  }
}

export async function syncTrackingForOrder(orderId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: cjOrder } = await admin
    .from("cj_orders")
    .select("cj_order_id")
    .eq("order_id", orderId)
    .maybeSingle();

  const cjId = (cjOrder as { cj_order_id: string } | null)?.cj_order_id;
  if (!cjId) return;

  try {
    const track = await getTracking(cjId);
    if (track.trackingNumber) {
      await admin.from("shipments").insert({
        order_id: orderId,
        cj_order_id: cjId,
        carrier: track.logisticName ? String(track.logisticName) : null,
        tracking_number: String(track.trackingNumber),
        status: track.trackingStatus ? String(track.trackingStatus) : "in_transit",
      });

      if (/deliver/i.test(String(track.trackingStatus ?? ""))) {
        await admin
          .from("orders")
          .update({ status: "delivered", updated_at: new Date().toISOString() })
          .eq("id", orderId);
      } else {
        await admin
          .from("orders")
          .update({ status: "shipped", updated_at: new Date().toISOString() })
          .eq("id", orderId);
      }
    }
  } catch (e) {
    await writeCjSyncLog({
      sync_type: "tracking",
      status: "error",
      message: e instanceof Error ? e.message : "tracking failed",
      metadata: { orderId, cjId },
    });
  }
}
