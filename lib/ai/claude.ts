import "server-only";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export type ClaudeMessage = { role: "user" | "assistant"; content: string };

export async function askClaude(input: {
  system: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  if (!model) throw new Error("ANTHROPIC_MODEL is not configured");

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: input.maxTokens ?? 600,
      system: input.system,
      messages: input.messages,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claude API request failed (${response.status}): ${detail.slice(0, 500)}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const text = (payload.content ?? [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

  return {
    text,
    inputTokens: payload.usage?.input_tokens ?? 0,
    outputTokens: payload.usage?.output_tokens ?? 0,
  };
}
