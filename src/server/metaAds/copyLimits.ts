// server-only — never import from a 'use client' file.
// Meta cuts text past fixed lengths. Small models overshoot them, so over-long fields get rewritten, then trimmed.

import type { AdCopy } from '../../types/admin/metaAds';
import type { CostMeter } from './cost';
import { metaAdsJson } from './llm';

/** Meta cuts text past these lengths, so they are hard limits. */
export const COPY_LIMITS = { headline: 40, primaryText: 125, primaryTextAlt: 125, overlayText: 32 } as const;
type LimitedField = keyof typeof COPY_LIMITS;

type Overflow = { id: string; ad: number; field: LimitedField; max: number; text: string };

const findOverflows = (ads: AdCopy[]): Overflow[] =>
  ads.flatMap((ad, i) =>
    (Object.keys(COPY_LIMITS) as LimitedField[])
      .filter((field) => ad[field].length > COPY_LIMITS[field])
      .map((field) => ({ id: `${i}.${field}`, ad: i, field, max: COPY_LIMITS[field], text: ad[field] })),
  );

/** Last resort: cut at the last sentence end within the limit, else the last whole word. */
export const trimToLimit = (text: string, max: number): string => {
  const head = text.slice(0, max + 1);
  const sentence = head.slice(0, max).match(/^[\s\S]*[.!?](?=\s|$)/)?.[0];
  if (sentence && sentence.length >= max * 0.5) return sentence.trim();
  return head.slice(0, head.lastIndexOf(' ', max)).replace(/[\s,;:—-]+$/, '').trim();
};

const rewrite = async (over: Overflow[], meter: CostMeter): Promise<Record<string, unknown>> =>
  metaAdsJson<Record<string, unknown>>(
    [
      { role: 'system', content: 'Rewrite each text to at most its target characters (spaces count). Keep the hook, the meaning, plain words and every qualifier such as "up to". Only complete sentences: never cut a sentence short or drop its verb; drop a whole sentence instead. Return JSON {"<id>": "<rewritten text>"}.' },
      { role: 'user', content: JSON.stringify(over.map(({ id, max, text }) => ({ id, target: max - 10, text }))) },
    ],
    { maxTokens: 4_000, meter, label: 'OpenAI shorten' },
  ).catch(() => ({}));

/** Up to two rewrite passes on the fields that are too long, then a clean trim. */
export const shortenOverLimit = async (ads: AdCopy[], meter: CostMeter): Promise<AdCopy[]> => {
  const next = ads.map((ad) => ({ ...ad }));
  for (let pass = 0; pass < 2; pass += 1) {
    const over = findOverflows(next);
    if (over.length === 0) return next;
    const raw = await rewrite(over, meter);
    for (const { id, ad, field } of over) {
      const text = raw[id];
      if (typeof text === 'string' && text.trim()) next[ad][field] = text.trim();
    }
  }
  for (const { ad, field, max } of findOverflows(next)) next[ad][field] = trimToLimit(next[ad][field], max);
  return next;
};
