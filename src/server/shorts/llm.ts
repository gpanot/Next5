// server-only — never import from a 'use client' file.
// Text models for the creative steps, at low reasoning, called directly on OpenAI (treg has no general text model).
// Benchmarked 2026-10-08 (2 runs each of DeepSeek V4 Pro, gpt-5.4, gpt-5.5, gpt-5.4-mini on the same brief, rated by Jev):
// quality was a near tie, so the script moved to gpt-5.4-mini (~5 s and under $0.01 a script vs gpt-5.5's $0.02-0.08).
// DeepSeek V4 Pro was 100-140 s a script and no better. Shot plans are on gpt-5.4-mini too. If a call fails,
// gpt-5.4-nano takes over so a short never dies on a text step.
// 2026-10-10: script, fact check, Visual Bible, storyboard, shot plans, photo check and voice casting run on the short's
// text model, picked when the short is created (gpt-6.1-sol or gpt-5.4-mini, to compare them); the classic cast stays
// on gpt-5.4-mini. The pipeline runs each step inside withTextModel(), and those calls read smartModel().

import { AsyncLocalStorage } from 'node:async_hooks';
import type { CostMeter } from '../metaAds/cost';
import type { ChatMessage } from '../ai/openai';
import { metaAdsJson } from '../metaAds/llm';

/** A user message: plain text, or text and images (vision calls: the Visual Bible and the photo check). */
export type UserContent = ChatMessage['content'];

/** Script, fact check, Visual Bible, storyboard, shot plans and photo check, when the short names no text model. */
export const SMART_MODEL = process.env.SHORTS_SMART_MODEL ?? 'gpt-6.1-sol';

const textModelStore = new AsyncLocalStorage<string>();

/** Runs `fn` with this short's text model (absent: the default). */
export const withTextModel = <T>(model: string | undefined, fn: () => Promise<T>): Promise<T> => (model ? textModelStore.run(model, fn) : fn());

/** The model of the script, fact check, Visual Bible, storyboard, shot plans, photo check and voice casting for the short being made. */
export const smartModel = (): string => textModelStore.getStore() ?? SMART_MODEL;
/** The classic cast. */
const CREATIVE_MODEL = process.env.SHORTS_CREATIVE_MODEL ?? 'gpt-5.4-mini';
const FALLBACK_MODEL = 'gpt-5.4-nano';
/** Reasoning effort: low is fast; medium thinks longer and was no better in the benchmark. */
const REASONING = (process.env.SHORTS_REASONING ?? 'low') as 'low' | 'medium' | 'high';

const openAiJson = <T>(model: string, system: string, user: UserContent, meter: CostMeter, label: string, fallback = false): Promise<T> =>
  metaAdsJson<T>(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    { maxTokens: 8_000, model, reasoningEffort: REASONING, meter, label: `${label} (${model}${fallback ? ', fallback' : ''})` },
  );

/** One JSON reply from the creative model (`model` overrides it, for tests); the fallback model when it fails. Costs go on `meter`. */
export const creativeJson = async <T>(system: string, user: UserContent, meter: CostMeter, label: string, model = CREATIVE_MODEL): Promise<T> => {
  try {
    return await openAiJson<T>(model, system, user, meter, label);
  } catch (err) {
    console.warn(`[shorts] ${model} failed, using ${FALLBACK_MODEL}:`, err instanceof Error ? err.message.slice(0, 160) : err);
    return openAiJson<T>(FALLBACK_MODEL, system, user, meter, label, true);
  }
};
