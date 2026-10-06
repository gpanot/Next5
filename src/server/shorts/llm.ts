// server-only — never import from a 'use client' file.
// Text models for the creative steps, at low reasoning, called directly on OpenAI (treg has no general text model).
// Benchmarked 2026-10-06: the script is on gpt-5.5 (keeps the 2-numbers rule, fewer unsupported claims, ~$0.04 a
// script); shot plans and accents on gpt-5.4-mini. DeepSeek V4 Pro was dropped (~70 s a script). If a call fails,
// gpt-5.4-nano takes over so a short never dies on a text step.

import type { CostMeter } from '../metaAds/cost';
import { metaAdsJson } from '../metaAds/llm';

/** The script writer. */
export const SCRIPT_MODEL = process.env.SHORTS_SCRIPT_MODEL ?? 'gpt-5.5';
/** Shot plans and accents. */
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
