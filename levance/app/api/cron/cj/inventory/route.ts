import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { getInventory, isCjConfigured } from "@/lib/integrations/cj";
import { writeCjSyncLog } from "@/lib/integrations/cj/sync-log";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isCjConfigured()) {
    return NextResponse.json({ error: "CJ not configured" }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  const { data: variants } = await admin
    .from("cj_variants")
    .select("cj_variant_id, variant_id")
    .not("variant_id", "is", null)
    .limit(100);

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
      await admin.from("inventory").upsert(
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
    sync_type: "inventory_cron",
    status: fail ? "partial" : "success",
    message: `ok=${ok} fail=${fail}`,
  });

  return NextResponse.json({ ok, fail });
}
