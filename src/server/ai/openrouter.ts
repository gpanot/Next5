// server-only — never import from a 'use client' file.
// Minimal OpenRouter chat client (OpenAI-compatible endpoint) for multi-turn vision + JSON calls.

type Part = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Part[];
};

export type OpenRouterOptions = {
  model: string;
  maxTokens: number;
  temperature?: number;
  seed?: number;
  timeoutMs?: number;
};

type OpenRouterResponse = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  error?: { message?: string };
};

/** One chat completion. Returns the reply text, or null on any failure (logged). */
export const openRouterChat = async (messages: OpenRouterMessage[], options: OpenRouterOptions): Promise<string | null> => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error('[openrouter] OPENROUTER_API_KEY is not set');
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'X-Title': 'Next5' },
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature ?? 0.2,
        ...(options.seed !== undefined ? { seed: options.seed } : {}),
        response_format: { type: 'json_object' },
        messages,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as OpenRouterResponse;
    if (!res.ok) {
      console.error(`[openrouter] ${options.model} returned ${res.status}: ${data.error?.message ?? 'no message'}`);
      return null;
    }
    const choice = data.choices?.[0];
    const text = choice?.message?.content;
    if (!text) console.error(`[openrouter] ${options.model} empty reply, finish_reason=${choice?.finish_reason ?? 'unknown'}`);
    return text || null;
  } catch (err) {
    console.error(`[openrouter] ${options.model} failed:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
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
