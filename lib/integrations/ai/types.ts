/**
 * Provider-agnostic AI interfaces for LÉVANCE.
 * No provider-specific endpoints are hard-coded here.
 */

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  /** Max tokens / length hint — provider adapter interprets */
  maxTokens?: number;
  temperature?: number;
  /** Opaque system prompt from LÉVANCE, not raw customer PII dumps */
  systemPrompt?: string;
}

export interface ChatResult {
  content: string;
  tokensIn?: number;
  tokensOut?: number;
  model?: string;
}

export interface StructuredProductSearch {
  query?: string;
  categorySlugs?: string[];
  colors?: string[];
  styles?: string[];
  maxPriceCents?: number;
  minPriceCents?: number;
  limit?: number;
}

export interface RecommendationContext {
  userId: string;
  limit?: number;
}

export interface MemoryRecord {
  category: "STYLE" | "SHOPPING" | "EXPLICIT" | "AI_CONTEXT";
  key: string;
  value: string;
  source: "explicit" | "inferred";
  confidence?: number;
}

export interface AiProvider {
  readonly name: string;
  isConfigured(): boolean;
  chat(options: ChatOptions): Promise<ChatResult>;
  /** Optional streaming — adapters may throw if unsupported */
  streamChat?(options: ChatOptions): AsyncIterable<string>;
  transcribe?(audio: ArrayBuffer): Promise<string>;
  synthesizeSpeech?(text: string): Promise<ArrayBuffer>;
}

export type VoiceUiState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "muted"
  | "error";
