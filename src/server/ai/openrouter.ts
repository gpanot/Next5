// server-only — never import from a 'use client' file.
// Minimal OpenRouter chat client (OpenAI-compatible endpoint) for multi-turn vision + JSON calls.
// Gemini 3.6 Flash runs on the Flex tier of Google AI Studio (half price, a bit slower), with the standard tier as fallback.

import { recordCost } from '../costs/ledger';

type Part =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  /** Base64 audio (Gemini listens to it). */
  | { type: 'input_audio'; input_audio: { data: string; format: 'wav' | 'mp3' } };

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Part[];
};

/** How long Gemini thinks before it answers. Thinking tokens count in maxTokens. Omit for the model default. */
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

export type OpenRouterOptions = {
  model: string;
  maxTokens: number;
  temperature?: number;
  seed?: number;
  timeoutMs?: number;
  reasoning?: ReasoningEffort;
};

/** The one Gemini Flash we use for vision + JSON calls. */
export const GEMINI_FLASH = 'google/gemini-3.6-flash';

/**
 * Flex tier for Gemini 3.6 Flash, pinned to Google AI Studio: half the standard price. Tested 2026-10-14 on our real
 * calls: 4.6 s a call vs 3.3 s on standard; Vertex Flex took 9 s. OpenRouter never falls back from flex by itself.
 */
const FLEX_ROUTING = { service_tier: 'flex', provider: { only: ['google-ai-studio'], allow_fallbacks: false } };

/** Share of the call's timeout given to the flex try. Portrait clone (50 s budget) takes about 27 s on flex. */
const FLEX_TIME_SHARE = 0.6;

type ChatResponse = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  /** OpenRouter reports what the call cost, in USD. */
  usage?: { cost?: number };
  error?: { message?: string };
};

const requestBody = (messages: OpenRouterMessage[], options: OpenRouterOptions, flex: boolean) => ({
  model: options.model,
  max_tokens: options.maxTokens,
  temperature: options.temperature ?? 0.2,
  ...(options.seed !== undefined ? { seed: options.seed } : {}),
  ...(options.reasoning ? { reasoning: { effort: options.reasoning } } : {}),
  ...(flex ? FLEX_ROUTING : {}),
  response_format: { type: 'json_object' },
  // Makes the reply carry usage.cost, which the cost ledger records.
  usage: { include: true },
  messages,
});

/** One POST. Returns the reply text, or null on any failure (logged). */
const post = async (key: string, body: ReturnType<typeof requestBody>, timeoutMs: number): Promise<string | null> => {
  const tag = `[openrouter] ${body.model}${'service_tier' in body ? ' (flex)' : ''}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'X-Title': 'Next5' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as ChatResponse;
    recordCost({ provider: 'openrouter', model: body.model, usdMicros: (data.usage?.cost ?? 0) * 1e6 });
    if (!res.ok) {
      console.error(`${tag} returned ${res.status}: ${data.error?.message ?? 'no message'}`);
      return null;
    }
    const choice = data.choices?.[0];
    const text = choice?.message?.content;
    if (!text) console.error(`${tag} empty reply, finish_reason=${choice?.finish_reason ?? 'unknown'}`);
    return text || null;
  } catch (err) {
    console.error(`${tag} failed:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** One chat completion. Returns the reply text, or null on any failure (logged). */
export const openRouterChat = async (messages: OpenRouterMessage[], options: OpenRouterOptions): Promise<string | null> => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error('[openrouter] OPENROUTER_API_KEY is not set');
    return null;
  }
  const timeoutMs = options.timeoutMs ?? 60_000;
  if (options.model === GEMINI_FLASH) {
    // Flex gets part of the time budget, so a stuck flex call still leaves room for the standard retry.
    const text = await post(key, requestBody(messages, options, true), Math.round(timeoutMs * FLEX_TIME_SHARE));
    if (text) return text;
  }
  return post(key, requestBody(messages, options, false), timeoutMs);
};

/** Parses a JSON object from a reply, tolerating a ```json fence around it. */
export const parseJsonObject = (text: string | null): Record<string, unknown> | null => {
  if (!text) return null;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const value: unknown = JSON.parse(raw.slice(start, end + 1));
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};
