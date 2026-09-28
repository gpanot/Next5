// server-only — never import from a 'use client' file.
// Numbers are where ad copy turns from true to false: "up to 50% off" shortened to "50% off", or a figure the site
// never gave. Every number in the copy must appear in the brand's proven facts, with its "up to" when the facts have one.

import type { AdCopy } from '../../types/admin/metaAds';
import type { CostMeter } from './cost';
import { metaAdsJson } from './llm';
import { clip } from './text';

const FIELDS = ['headline', 'primaryText', 'primaryTextAlt', 'overlayText'] as const;
type Field = (typeof FIELDS)[number];

/** $3, 50%, 45,000+, 1m+, 30k */
const NUMBER_RE = /\$\s?\d[\d,.]*[km]?\+?|\d[\d,.]*\s?%|\d[\d,.]*\s?[km]\+?|\d{2,}[\d,.]*\+?/gi;

const clean = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');
const token = (n: string) => clean(n).replace(/\s/g, '');

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const numbersIn = (text: string): string[] => text.match(NUMBER_RE) ?? [];

/** Puts back an "up to" the facts have and the copy dropped. */
export const restoreUpTo = (text: string, facts: string): string =>
  numbersIn(text).reduce((out, n) => {
    const t = escape(n.trim());
    const factHasUpTo = new RegExp(`up to\\s*${t}`, 'i').test(facts);
    const copyHasUpTo = new RegExp(`up to\\s*${t}`, 'i').test(out);
    return factHasUpTo && !copyHasUpTo ? out.replace(new RegExp(`(?<!up to\\s*)${t}`, 'i'), (m) => `up to ${m}`).replace(/^up to/, 'Up to') : out;
  }, text);

/** Numbers in `text` that the facts never state. */
export const unsupportedNumbers = (text: string, facts: string): string[] => {
  const known = clean(facts).replace(/\s/g, '');
  return numbersIn(text).filter((n) => !known.includes(token(n)));
};

type Problem = { id: string; ad: number; field: Field; text: string; bad: string[] };

const findProblems = (ads: AdCopy[], facts: string): Problem[] =>
  ads.flatMap((ad, i) =>
    FIELDS.map((field) => ({ id: `${i}.${field}`, ad: i, field, text: ad[field], bad: unsupportedNumbers(ad[field], facts) })).filter((p) => p.bad.length > 0),
  );

/**
 * 1. Restores dropped "up to" qualifiers (no model involved).
 * 2. One rewrite for fields with numbers the facts do not state. 3. Anything still unsupported loses the number's
 *    sentence rather than shipping a false claim.
 */
export const enforceClaims = async (ads: AdCopy[], facts: string, meter: CostMeter): Promise<AdCopy[]> => {
  const next = ads.map((ad) => ({ ...ad, ...Object.fromEntries(FIELDS.map((f) => [f, restoreUpTo(ad[f], facts)])) }) as AdCopy);
  const problems = findProblems(next, facts);
  if (problems.length === 0) return next;
  const raw = await metaAdsJson<Record<string, unknown>>(
    [
      { role: 'system', content: 'Each text has numbers the brand cannot prove. Rewrite it without those numbers (or with a number from FACTS, word for word), same meaning and length or shorter. Return JSON {"<id>": "<text>"}.' },
      { role: 'user', content: `FACTS\n${clip(facts, 4_000)}\n\nTEXTS\n${JSON.stringify(problems.map(({ id, text, bad }) => ({ id, text, unsupported: bad })))}` },
    ],
    { maxTokens: 4_000, meter, label: 'OpenAI claim fix' },
  ).catch(() => ({}) as Record<string, unknown>);
  for (const { id, ad, field } of problems) {
    const text = raw[id];
    if (typeof text === 'string' && text.trim()) next[ad][field] = restoreUpTo(text.trim(), facts);
  }
  for (const { ad, field } of findProblems(next, facts)) {
    const kept = next[ad][field].split(/(?<=[.!?])\s+/).filter((s) => unsupportedNumbers(s, facts).length === 0).join(' ');
    next[ad][field] = kept || next[ad][field].replace(NUMBER_RE, '').replace(/\s+/g, ' ').trim();
  }
  return next;
};
