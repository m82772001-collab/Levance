import "server-only";
import type { AiProvider, ChatOptions, ChatResult } from "./types";
import { getAiModel, getAiProviderName, isAiProviderConfigured } from "./config";

/**
 * Null provider — used when AI is not configured.
 * Never invents product data or conversational fabrications presented as live AI.
 */
class UnconfiguredProvider implements AiProvider {
  readonly name = "unconfigured";

  isConfigured() {
    return false;
  }

  async chat(_options: ChatOptions): Promise<ChatResult> {
    throw new Error(
      "AI provider is not configured. Set AI_PROVIDER and AI_API_KEY to enable the concierge."
    );
  }
}

/**
 * Generic HTTP chat adapter.
 * Expects an OpenAI-compatible chat completions shape at AI_API_BASE_URL.
 * Does not hard-code a commercial vendor; base URL is configuration-dependent.
 */
class CompatibleChatProvider implements AiProvider {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  isConfigured() {
    return isAiProviderConfigured();
  }

  async chat(options: ChatOptions): Promise<ChatResult> {
    const apiKey = process.env.AI_API_KEY;
    const baseUrl = (process.env.AI_API_BASE_URL ?? "").replace(/\/$/, "");
    const model = getAiModel();

    if (!apiKey || !baseUrl || !model) {
      throw new Error("AI provider configuration incomplete (key, base URL, or model).");
    }

    const messages = [
      ...(options.systemPrompt
        ? [{ role: "system" as const, content: options.systemPrompt }]
        : []),
      ...options.messages,
    ];

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.4,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI provider error (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    return {
      content,
      tokensIn: data.usage?.prompt_tokens,
      tokensOut: data.usage?.completion_tokens,
      model: data.model ?? model,
    };
  }
}

let _provider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (_provider) return _provider;
  if (!isAiProviderConfigured()) {
    _provider = new UnconfiguredProvider();
    return _provider;
  }
  _provider = new CompatibleChatProvider(getAiProviderName());
  return _provider;
}

export function getVoiceProviderStatus(): {
  configured: boolean;
  provider: string;
} {
  return {
    configured: Boolean(process.env.VOICE_API_KEY && process.env.VOICE_PROVIDER),
    provider: process.env.VOICE_PROVIDER ?? "none",
  };
}
