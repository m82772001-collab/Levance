import "server-only";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { z } from "zod";

export type MemoryCategory = "STYLE" | "SHOPPING" | "EXPLICIT" | "AI_CONTEXT";
export type MemorySource = "explicit" | "inferred";

export type AiMemory = {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  source: MemorySource;
  confidence: number | null;
  created_at: string;
  updated_at: string;
};

const upsertSchema = z.object({
  category: z.enum(["STYLE", "SHOPPING", "EXPLICIT", "AI_CONTEXT"]),
  key: z.string().min(1).max(80),
  value: z.string().min(1).max(2000),
  source: z.enum(["explicit", "inferred"]).default("explicit"),
  confidence: z.number().min(0).max(1).optional(),
});

export async function listMemories(userId: string): Promise<AiMemory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_memories")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as AiMemory[]) ?? [];
}

export async function upsertMemory(
  userId: string,
  input: z.input<typeof upsertSchema>
): Promise<void> {
  const parsed = upsertSchema.parse(input);
  // Never promote inferred to explicit without user action
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ai_memories").upsert(
    {
      user_id: userId,
      category: parsed.category,
      key: parsed.key,
      value: parsed.value,
      source: parsed.source,
      confidence: parsed.source === "inferred" ? (parsed.confidence ?? 0.5) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category,key" }
  );
  if (error) throw error;
}

export async function deleteMemory(userId: string, memoryId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("ai_memories")
    .delete()
    .eq("id", memoryId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function clearAllMemories(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ai_memories").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function getMemorySettings(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ai_user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (
    data ?? {
      personalization_enabled: true,
      memory_enabled: true,
      voice_enabled: true,
    }
  );
}

export async function updateMemorySettings(
  userId: string,
  patch: {
    personalization_enabled?: boolean;
    memory_enabled?: boolean;
    voice_enabled?: boolean;
  }
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ai_user_settings").upsert({
    user_id: userId,
    ...patch,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Context string for AI — excludes unnecessary PII; respects memory_enabled */
export async function buildMemoryContext(userId: string): Promise<string> {
  const settings = await getMemorySettings(userId);
  if (!(settings as { memory_enabled?: boolean }).memory_enabled) {
    return "";
  }
  const memories = await listMemories(userId);
  // Prefer explicit; include high-confidence inferred only
  const usable = memories.filter(
    (m) => m.source === "explicit" || (m.confidence != null && m.confidence >= 0.7)
  );
  if (!usable.length) return "";
  return usable
    .slice(0, 20)
    .map((m) => `[${m.category}/${m.key}] ${m.value}`)
    .join("\n");
}
