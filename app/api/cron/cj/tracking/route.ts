import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { isCjConfigured } from "@/lib/integrations/cj";
import { syncTrackingForOrder } from "@/lib/integrations/cj/fulfillment";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isCjConfigured()) {
    return NextResponse.json({ error: "CJ not configured" }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select("id")
    .in("status", ["fulfilling", "shipped", "paid"])
    .limit(30);

  let n = 0;
  for (const o of orders ?? []) {
    await syncTrackingForOrder((o as { id: string }).id);
    n++;
  }
  return NextResponse.json({ processed: n });
}
