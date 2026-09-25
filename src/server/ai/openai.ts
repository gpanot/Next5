// server-only — never import from a 'use client' file.

type Content = string | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' | 'high' } })[];
export type ChatMessage = { role: 'system' | 'user'; content: Content };

export type ChatUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type ChatMeta = {
  usage: ChatUsage | null;
  elapsedMs: number;
  model: string;
};

/** True when real OpenAI calls are allowed (key present, not in mock mode). */
export const isOpenAiEnabled = (): boolean => Boolean(process.env.OPENAI_API_KEY) && process.env.NEXT5_MOCK_GENERATION !== 'true';

/** One OpenAI JSON completion. Defaults to gpt-4o-mini. Returns null on any failure — callers keep a fallback. */
export const chatJson = async <T>(messages: ChatMessage[], options: { maxTokens: number; temperature?: number; timeoutMs?: number; model?: string }): Promise<T | null> => {
  const meta = await chatJsonWithMeta<T>(messages, options);
  return meta.result;
};

/**
 * Same as chatJson but also returns token usage and wall-clock time.
 * Never throws — errors produce `{ result: null, meta: { usage: null, elapsedMs } }`.
 */
export const chatJsonWithMeta = async <T>(
  messages: ChatMessage[],
  options: { maxTokens: number; temperature?: number; timeoutMs?: number; model?: string },
): Promise<{ result: T | null; meta: ChatMeta }> => {
  const key = process.env.OPENAI_API_KEY;
  const model = options.model ?? 'gpt-4o-mini';
  const t0 = Date.now();
  if (!key) {
    console.error('[chatJsonWithMeta] OPENAI_API_KEY is not set — returning null');
    return { result: null, meta: { usage: null, elapsedMs: 0, model } };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        response_format: { type: 'json_object' },
        messages,
      }),
    });
    const elapsedMs = Date.now() - t0;
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[chatJsonWithMeta] OpenAI returned ${res.status}: ${errBody.slice(0, 200)}`);
      return { result: null, meta: { usage: null, elapsedMs, model } };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      model?: string;
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      // Log finish_reason so we know if it was a length cutoff or refusal
      const finishReason = (data.choices?.[0] as { finish_reason?: string } | undefined)?.finish_reason ?? 'unknown';
      console.error(`[chatJsonWithMeta] Empty content from model="${model}" finish_reason="${finishReason}"`);
      return { result: null, meta: { usage: null, elapsedMs, model } };
    }
    const result = JSON.parse(text) as T;
    const u = data.usage;
    const usage: ChatUsage | null = u
      ? { promptTokens: u.prompt_tokens ?? 0, completionTokens: u.completion_tokens ?? 0, totalTokens: u.total_tokens ?? 0 }
      : null;
    return { result, meta: { usage, elapsedMs, model: data.model ?? model } };
  } catch (err) {
    console.error('[chatJsonWithMeta] Exception:', err);
    return { result: null, meta: { usage: null, elapsedMs: Date.now() - t0, model } };
  } finally {
    clearTimeout(timer);
  }
};
