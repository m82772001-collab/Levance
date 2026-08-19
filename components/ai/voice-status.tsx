"use client";

import type { VoiceUiState } from "@/lib/integrations/ai/types";

/**
 * Voice UI foundation — states only.
 * Does not simulate a working voice assistant without a configured provider.
 */
export function VoiceStatus({
  configured,
  state = "idle",
}: {
  configured: boolean;
  state?: VoiceUiState;
}) {
  if (!configured) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-5 py-6 text-center">
        <p className="text-sm text-neutral-600">Voice concierge unavailable</p>
        <p className="mt-1 text-xs text-neutral-400">
          Configure VOICE_PROVIDER and VOICE_API_KEY to enable listening and speech.
        </p>
      </div>
    );
  }

  const labels: Record<VoiceUiState, string> = {
    idle: "Ready",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
    muted: "Muted",
    error: "Error",
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-5 py-4 flex items-center justify-between">
      <span className="text-sm text-neutral-600">{labels[state]}</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled
          className="rounded border border-neutral-200 px-3 py-1.5 text-xs text-neutral-400"
          title="Requires voice provider integration"
        >
          Start
        </button>
        <button
          type="button"
          disabled
          className="rounded border border-neutral-200 px-3 py-1.5 text-xs text-neutral-400"
        >
          Mute
        </button>
      </div>
    </div>
  );
}
