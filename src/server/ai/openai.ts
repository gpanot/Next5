// server-only — never import from a 'use client' file.

type Content = string | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' | 'high' } })[];
export type ChatMessage = { role: 'system' | 'user'; content: Content };

/** True when real OpenAI calls are allowed (key present, not in mock mode). */
export const isOpenAiEnabled = (): boolean => Boolean(process.env.OPENAI_API_KEY) && process.env.NEXT5_MOCK_GENERATION !== 'true';

/** One gpt-4o-mini JSON completion. Returns null on any failure — callers keep a fallback. */
export const chatJson = async <T>(messages: ChatMessage[], options: { maxTokens: number; temperature?: number; timeoutMs?: number }): Promise<T | null> => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        response_format: { type: 'json_object' },
        messages,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};
