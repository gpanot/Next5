// server-only — never import from a 'use client' file.
// One OpenAI Responses call with the web_search tool on. Used where the model must find live facts (market stats,
// nearby places) instead of inventing them. Returns the model's text, or null on any failure.

import { recordCost } from '../costs/ledger';
import { openAiCostMicros } from '../metaAds/cost';
import { isOpenAiEnabled } from './openai';

type ResponsesBody = {
  output_text?: string;
  output?: { type: string; content?: { type: string; text?: string }[] }[];
  usage?: { input_tokens?: number; output_tokens?: number };
  model?: string;
};

const outputText = (body: ResponsesBody): string =>
  body.output_text ??
  (body.output ?? []).flatMap((o) => o.content ?? []).filter((c) => c.type === 'output_text').map((c) => c.text ?? '').join('');

/** Web search calls also bill per search; we record tokens only, so the ledger under-counts a little. */
export const webSearchText = async (
  input: string,
  opts: { model?: string; effort?: 'low' | 'medium'; timeoutMs?: number; tag: string },
): Promise<{ text: string; usdMicros: number } | null> => {
  if (!isOpenAiEnabled()) return null;
  const model = opts.model ?? 'gpt-5.4-mini';
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, tools: [{ type: 'web_search' }], reasoning: { effort: opts.effort ?? 'low' }, input }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
    });
    if (!res.ok) {
      console.error(`[${opts.tag}] OpenAI`, res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const body = (await res.json()) as ResponsesBody;
    const u = body.usage;
    const usdMicros = u ? openAiCostMicros(body.model ?? model, u.input_tokens ?? 0, u.output_tokens ?? 0) : 0;
    if (usdMicros > 0) recordCost({ provider: 'openai', model, usdMicros });
    return { text: outputText(body), usdMicros };
  } catch (err) {
    console.error(`[${opts.tag}] failed:`, err instanceof Error ? err.message : err);
    return null;
  }
};

/** The first {...} block of a model reply, parsed; null when there is none or it is not JSON. */
export const jsonObjectIn = (text: string): Record<string, unknown> | null => {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** False only when the source is clearly gone (404/410, no DNS). Bot walls (403/429) still count as a live page. */
export const sourceIsLive = async (url: string): Promise<boolean> => {
  const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36' };
  try {
    let res = await fetch(url, { method: 'HEAD', headers, redirect: 'follow', signal: AbortSignal.timeout(8_000) });
    if (res.status === 405 || res.status === 501) res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(8_000) });
    return res.status !== 404 && res.status !== 410;
  } catch {
    return false;
  }
};
