import { NextResponse } from "next/server";
import { z } from "zod";
import { askClaude } from "@/lib/ai/claude";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversation: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(12).default([]),
});

const SYSTEM_PROMPT = `You are LÉVANCE's showroom shopping assistant. Only answer using the supplied LÉVANCE catalog and brand/FAQ context. Never invent products, prices, availability, shipping promises, brand partnerships, or discounts. If the catalog does not contain the requested item, say that clearly and suggest the closest catalog match. Treat third-party brands as independent unless is_authorized_reseller is true. Keep answers concise and useful for shopping.`;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid assistant request." }, { status: 400 });

    const [{ data: products }, { data: memories }] = await Promise.all([
      supabase.from("products").select("id,name,slug,description,brand,attributes,is_active,model_url").eq("is_active", true).limit(80),
      supabase.from("assistant_memory").select("memory_key,memory_value").eq("user_id", user.id).limit(20),
    ]);

    const catalogContext = JSON.stringify(products ?? []);
    const memoryContext = JSON.stringify(memories ?? []);
    const system = `${SYSTEM_PROMPT}\n\nCatalog:\n${catalogContext}\n\nUser memory (may be empty):\n${memoryContext}`;

    const result = await askClaude({
      system,
      messages: [...parsed.data.conversation, { role: "user", content: parsed.data.message }],
      maxTokens: 700,
    });

    await supabase.from("ai_usage").insert({
      user_id: user.id,
      feature: "showroom_assistant",
      tokens_in: result.inputTokens,
      tokens_out: result.outputTokens,
    });

    return NextResponse.json({ message: result.text });
  } catch (error) {
    console.error("assistant_request_failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "The assistant is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
