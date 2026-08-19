"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { tierAtLeast } from "@/lib/membership/benefits";
import { requireShowroomAccess, requireMonarchAccess } from "./access";
import { runConcierge, ensureConversation } from "./concierge";
import {
  clearAllMemories,
  deleteMemory,
  updateMemorySettings,
  upsertMemory,
} from "./memory";
import {
  buildCollectionFromTheme,
  deleteCollection,
} from "./collections";

export type AiActionState = {
  error?: string;
  success?: string;
  reply?: string;
  productSlugs?: string[];
  conversationId?: string;
};

async function requirePremiumPlus() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!tierAtLeast(user.membershipTier, "PREMIUM")) redirect("/membership");
  return user;
}

export async function conciergeMessageAction(
  _prev: AiActionState,
  formData: FormData
): Promise<AiActionState> {
  const context = String(formData.get("context") ?? "showroom") as
    | "showroom"
    | "monarch";

  const user =
    context === "monarch"
      ? await requireMonarchAccess()
      : await requireShowroomAccess();

  const message = String(formData.get("message") ?? "").trim();
  if (!message || message.length > 2000) {
    return { error: "Please enter a message." };
  }

  let conversationId = String(formData.get("conversationId") ?? "") || undefined;
  if (!conversationId) {
    conversationId = (await ensureConversation(user.id, context)) ?? undefined;
  }

  const result = await runConcierge({
    userId: user.id,
    tier: user.membershipTier,
    message,
    conversationId,
    context,
  });

  return {
    reply: result.reply,
    productSlugs: result.products.map((p) => p.slug),
    conversationId: conversationId,
    error: result.error && result.error !== "quota" ? result.error : undefined,
    success: result.error === "quota" ? result.reply : undefined,
  };
}

export async function deleteMemoryAction(
  _prev: AiActionState,
  formData: FormData
): Promise<AiActionState> {
  const user = await requirePremiumPlus();
  const id = String(formData.get("memoryId") ?? "");
  if (!id) return { error: "Missing memory." };
  await deleteMemory(user.id, id);
  revalidatePath("/account/ai-memory");
  return { success: "Memory removed." };
}

export async function clearMemoryAction(): Promise<AiActionState> {
  const user = await requirePremiumPlus();
  await clearAllMemories(user.id);
  revalidatePath("/account/ai-memory");
  return { success: "All AI memory cleared." };
}

export async function saveExplicitPreferenceAction(
  _prev: AiActionState,
  formData: FormData
): Promise<AiActionState> {
  const user = await requirePremiumPlus();
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!key || !value) return { error: "Key and value required." };

  await upsertMemory(user.id, {
    category: "EXPLICIT",
    key,
    value,
    source: "explicit",
  });
  revalidatePath("/account/ai-memory");
  return { success: "Preference saved." };
}

export async function updateAiSettingsAction(
  _prev: AiActionState,
  formData: FormData
): Promise<AiActionState> {
  const user = await requirePremiumPlus();
  await updateMemorySettings(user.id, {
    personalization_enabled: formData.get("personalization") === "on",
    memory_enabled: formData.get("memory") === "on",
    voice_enabled: formData.get("voice") === "on",
  });
  revalidatePath("/account/ai-memory");
  return { success: "Settings updated." };
}

export async function buildCollectionAction(
  _prev: AiActionState,
  formData: FormData
): Promise<AiActionState> {
  const user = await requirePremiumPlus();
  const theme = String(formData.get("theme") ?? "").trim();
  if (!theme) return { error: "Describe the collection theme." };

  const col = await buildCollectionFromTheme(user.id, theme);
  if (!col) {
    return {
      error:
        "Could not build a collection from the catalogue. Try a different theme, or enable AI_COLLECTION_BUILDER.",
    };
  }
  revalidatePath("/showroom");
  revalidatePath("/monarch");
  return {
    success: `Collection “${col.name}” created with real catalogue pieces.`,
  };
}

export async function deleteCollectionAction(
  _prev: AiActionState,
  formData: FormData
): Promise<AiActionState> {
  const user = await requirePremiumPlus();
  const id = String(formData.get("collectionId") ?? "");
  if (!id) return { error: "Missing collection." };
  await deleteCollection(user.id, id);
  revalidatePath("/showroom");
  revalidatePath("/monarch");
  return { success: "Collection deleted." };
}
