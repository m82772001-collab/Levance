import { requireUser } from "@/lib/auth/rbac";
import { tierAtLeast } from "@/lib/membership/benefits";
import { redirect } from "next/navigation";
import { listMemories, getMemorySettings } from "@/lib/ai/memory";
import { MemoryManager } from "@/components/ai/memory-manager";

export const metadata = { title: "AI Memory" };

export default async function AiMemoryPage() {
  const user = await requireUser();
  if (!tierAtLeast(user.membershipTier, "PREMIUM")) {
    redirect("/membership");
  }

  const [memories, settings] = await Promise.all([
    listMemories(user.id).catch(() => []),
    getMemorySettings(user.id).catch(() => ({
      personalization_enabled: true,
      memory_enabled: true,
      voice_enabled: true,
    })),
  ]);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <p className="eyebrow mb-2">Account</p>
        <h1 className="font-display text-3xl">AI memory</h1>
        <p className="mt-2 text-sm text-neutral-600">
          LÉVANCE only stores structured preferences you control. Inferred items are marked
          separately and never treated as confirmed without your input. You can forget anything.
        </p>
      </div>
      <MemoryManager
        memories={memories}
        settings={{
          personalization_enabled: Boolean(
            (settings as { personalization_enabled?: boolean }).personalization_enabled
          ),
          memory_enabled: Boolean(
            (settings as { memory_enabled?: boolean }).memory_enabled
          ),
          voice_enabled: Boolean((settings as { voice_enabled?: boolean }).voice_enabled),
        }}
      />
    </div>
  );
}
