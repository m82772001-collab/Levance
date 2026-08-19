"use client";

import { useActionState } from "react";
import {
  clearMemoryAction,
  deleteMemoryAction,
  saveExplicitPreferenceAction,
  updateAiSettingsAction,
  type AiActionState,
} from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import type { AiMemory } from "@/lib/ai/memory";

export function MemoryManager({
  memories,
  settings,
}: {
  memories: AiMemory[];
  settings: {
    personalization_enabled: boolean;
    memory_enabled: boolean;
    voice_enabled: boolean;
  };
}) {
  const [delState, delAction] = useActionState(deleteMemoryAction, {} as AiActionState);
  const [clearState, clearAction] = useActionState(
    async () => clearMemoryAction(),
    {} as AiActionState
  );
  const [saveState, saveAction, saving] = useActionState(
    saveExplicitPreferenceAction,
    {} as AiActionState
  );
  const [setState, setAction] = useActionState(updateAiSettingsAction, {} as AiActionState);

  return (
    <div className="space-y-10">
      <form action={setAction} className="rounded-lg border border-neutral-200 bg-white p-6 space-y-3">
        <h2 className="font-display text-lg">Controls</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="personalization"
            defaultChecked={settings.personalization_enabled}
          />
          Personalization enabled
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="memory" defaultChecked={settings.memory_enabled} />
          Memory enabled
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="voice" defaultChecked={settings.voice_enabled} />
          Voice preferred when available
        </label>
        <Button type="submit" variant="secondary">
          Save settings
        </Button>
        {setState.success && <p className="text-xs text-success">{setState.success}</p>}
      </form>

      <section>
        <h2 className="font-display text-lg mb-4">Stored memories</h2>
        {memories.length === 0 ? (
          <p className="text-sm text-neutral-500">No memories stored.</p>
        ) : (
          <ul className="space-y-3">
            {memories.map((m) => (
              <li
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4"
              >
                <div className="text-sm">
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    {m.category} · {m.source}
                    {m.source === "inferred" && m.confidence != null
                      ? ` · confidence ${Math.round(m.confidence * 100)}%`
                      : ""}
                  </p>
                  <p className="mt-1 font-medium">{m.key}</p>
                  <p className="text-neutral-600">{m.value}</p>
                </div>
                <form action={delAction}>
                  <input type="hidden" name="memoryId" value={m.id} />
                  <Button type="submit" variant="ghost" className="text-xs text-danger">
                    Forget
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {(delState.success || clearState.success) && (
          <p className="mt-3 text-xs text-success">
            {delState.success || clearState.success}
          </p>
        )}
        {memories.length > 0 && (
          <form action={clearAction} className="mt-4">
            <Button type="submit" variant="secondary" className="text-danger">
              Clear all AI memory
            </Button>
          </form>
        )}
      </section>

      <form action={saveAction} className="rounded-lg border border-neutral-200 bg-white p-6 space-y-3">
        <h2 className="font-display text-lg">Add explicit preference</h2>
        <input
          name="key"
          required
          placeholder="Key (e.g. preferred_style)"
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          name="value"
          required
          placeholder="Value (e.g. minimalist)"
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save preference"}
        </Button>
        {saveState.error && <p className="text-xs text-danger">{saveState.error}</p>}
        {saveState.success && <p className="text-xs text-success">{saveState.success}</p>}
      </form>
    </div>
  );
}
