// server-only — never import from a 'use client' file.
// Text models for the creative steps, at low reasoning, called directly on OpenAI (treg has no general text model).
// Benchmarked 2026-10-08 (2 runs each of DeepSeek V4 Pro, gpt-5.4, gpt-5.5, gpt-5.4-mini on the same brief, rated by Jev):
// quality was a near tie, so the script moved to gpt-5.4-mini (~5 s and under $0.01 a script vs gpt-5.5's $0.02-0.08).
// DeepSeek V4 Pro was 100-140 s a script and no better. Shot plans are on gpt-5.4-mini too. If a call fails,
// gpt-5.4-nano takes over so a short never dies on a text step.

import type { CostMeter } from '../metaAds/cost';
import { metaAdsJson } from '../metaAds/llm';

/** The script writer. */
export const SCRIPT_MODEL = process.env.SHORTS_SCRIPT_MODEL ?? 'gpt-5.4-mini';
/** Shot plans, cast and voice casting. */
const CREATIVE_MODEL = process.env.SHORTS_CREATIVE_MODEL ?? 'gpt-5.4-mini';
const FALLBACK_MODEL = 'gpt-5.4-nano';
/** Reasoning effort: low is fast; medium thinks longer and was no better in the benchmark. */
const REASONING = (process.env.SHORTS_REASONING ?? 'low') as 'low' | 'medium' | 'high';

const openAiJson = <T>(model: string, system: string, user: string, meter: CostMeter, label: string, fallback = false): Promise<T> =>
  metaAdsJson<T>(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    { maxTokens: 8_000, model, reasoningEffort: REASONING, meter, label: `${label} (${model}${fallback ? ', fallback' : ''})` },
  );

/** One JSON reply from the creative model (`model` overrides it, for tests); the fallback model when it fails. Costs go on `meter`. */
export const creativeJson = async <T>(system: string, user: string, meter: CostMeter, label: string, model = CREATIVE_MODEL): Promise<T> => {
  try {
    return await openAiJson<T>(model, system, user, meter, label);
  } catch (err) {
    console.warn(`[shorts] ${model} failed, using ${FALLBACK_MODEL}:`, err instanceof Error ? err.message.slice(0, 160) : err);
    return openAiJson<T>(FALLBACK_MODEL, system, user, meter, label, true);
  }
};
