import { NextResponse } from "next/server";
import { z } from "zod";
import { matchTrends } from "@/lib/trends/match";

const schema = z.object({
  trends: z.array(z.object({ term: z.string().trim().min(1).max(120), source: z.string().trim().max(80).optional() })).min(1).max(30),
});

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid trend payload" }, { status: 400 });
    const matches = await matchTrends(parsed.data.trends);
    return NextResponse.json({ matches });
  } catch (error) {
    console.error("trend_match_failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "Trend matching failed" }, { status: 503 });
  }
}
