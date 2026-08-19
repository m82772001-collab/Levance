"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { conciergeMessageAction, type AiActionState } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";

type Props = {
  context: "showroom" | "monarch";
  configured: boolean;
  voiceConfigured: boolean;
};

export function ConciergePanel({ context, configured, voiceConfigured }: Props) {
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>(
    []
  );
  const [state, formAction, pending] = useActionState(
    async (prev: AiActionState, formData: FormData) => {
      const result = await conciergeMessageAction(prev, formData);
      const msg = String(formData.get("message") ?? "");
      if (msg) {
        setMessages((m) => [
          ...m,
          { role: "user", text: msg },
          ...(result.reply ? [{ role: "assistant" as const, text: result.reply }] : []),
        ]);
      }
      if (result.conversationId) setConversationId(result.conversationId);
      return result;
    },
    {} as AiActionState
  );

  return (
    <div className="flex flex-col rounded-lg border border-neutral-200 bg-white overflow-hidden min-h-[420px]">
      <div className="border-b border-neutral-100 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="eyebrow text-neutral-500">Concierge</p>
          <h2 className="font-display text-lg">
            {context === "monarch" ? "Private Salon" : "Private Showroom"}
          </h2>
        </div>
        {!configured && (
          <span className="text-xs text-neutral-500 rounded-full border border-neutral-200 px-3 py-1">
            Provider pending
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 max-h-[320px]">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500 leading-relaxed">
            Ask for elegant pieces, a budget, a comparison, or a collection theme.
            Answers are grounded in the real LÉVANCE catalogue
            {configured ? "" : " — conversational AI activates when a provider is configured"}.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm leading-relaxed ${
              m.role === "user"
                ? "text-obsidian font-medium"
                : "text-neutral-600 border-l-2 border-champagne/40 pl-3"
            }`}
          >
            {m.text}
          </div>
        ))}
        {state.productSlugs && state.productSlugs.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {state.productSlugs.map((slug) => (
              <Link
                key={slug}
                href={`/product/${slug}`}
                className="text-xs rounded border border-neutral-200 px-3 py-1.5 hover:border-obsidian"
              >
                View product
              </Link>
            ))}
          </div>
        )}
      </div>

      <form action={formAction} className="border-t border-neutral-100 p-4 space-y-3">
        <input type="hidden" name="context" value={context} />
        <input type="hidden" name="conversationId" value={conversationId} />
        <textarea
          name="message"
          rows={2}
          required
          maxLength={2000}
          placeholder="e.g. Something elegant and black under $200"
          className="w-full resize-none rounded border border-neutral-300 px-3 py-2 text-sm focus:border-champagne focus:outline-none focus:ring-1 focus:ring-champagne"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending} className="min-w-[120px]">
            {pending ? "Thinking…" : "Send"}
          </Button>
          {!voiceConfigured && (
            <span className="text-xs text-neutral-400">Voice concierge unavailable</span>
          )}
        </div>
        {state.error && <p className="text-xs text-danger">{state.error}</p>}
      </form>
    </div>
  );
}
