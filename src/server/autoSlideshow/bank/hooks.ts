// server-only — never import from a 'use client' file.
// Bank step 2: hooks for one meat, from the hook library. 18 drafts → failing ones get one rewrite with their reasons →
// an editor call scores them → the best 10 are kept, one per pattern. Too few kept: one more full round.

import type { BankHook, BankMeat } from '../../../types/admin/slideshowBank';
import type { CostMeter } from '../../metaAds/cost';
import { metaAdsJson } from '../../metaAds/llm';
import { clip } from '../../metaAds/text';
import { hookProblems } from './checks';
import { libraryHook, shortlistText, toPatternId } from './library';
import { HOOK_COUNT, HOOK_SYSTEM, JUDGE_SYSTEM } from './prompts';

export const HOOKS_PER_MEAT = 10;
const MIN_HOOKS = 8;
/** Out of 15; every axis must also score 3+. */
const MIN_SCORE = 11;
const MIN_AXIS = 3;

type Draft = { patternId: string; text: string; photo: string; problems: string[]; score?: number; minAxis?: number };
type RawHook = { patternId?: unknown; text?: unknown; photo?: unknown };

const str = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.replace(/\s+/g, ' ').trim(), max) : '');

const describeMeat = (m: BankMeat) =>
  `MEAT SET (goal ${m.goal}, ${m.items.length} slides, listicle ${m.listicle}): ${m.topic}\nPromise: ${m.promise}\nSlides: ${m.items.map((it, k) => `${k + 1}. ${it.title} — ${it.body}`).join(' | ')}`;

const numberRule = (m: BankMeat) =>
  m.listicle
    ? `a hook may count the slides only with the number ${m.items.length}; at most 3 hooks use a number.`
    : 'this meat is not a list: no number in any hook.';

const toDraft = (raw: RawHook, meat: BankMeat, brand: string): Draft => {
  const draft = { patternId: toPatternId(raw.patternId), text: str(raw.text, 120), photo: str(raw.photo, 400) };
  return { ...draft, problems: draft.text ? hookProblems(draft, meat, brand) : ['empty hook'] };
};

const ask = (system: string, user: string, meter: CostMeter, label: string, maxTokens: number) =>
  metaAdsJson<{ hooks?: RawHook[]; scores?: unknown }>([{ role: 'system', content: system }, { role: 'user', content: user }], { maxTokens, meter, label });

/** One rewrite for the drafts that failed a check, each with its reasons. */
const repair = async (failing: Draft[], system: string, context: string, meat: BankMeat, brand: string, meter: CostMeter) => {
  if (failing.length === 0) return;
  const list = failing.map((h, i) => `${i}. patternId ${h.patternId} (pattern: "${libraryHook(h.patternId)?.text ?? '?'}") hook: "${h.text}" photo: "${h.photo}" -> problems: ${h.problems.join(', ')}`);
  const raw = await ask(system, `${context}\n\nRewrite ONLY these hooks so each fixes its problems. Same patternId; keep its fixed words; max 10 words.\n${list.join('\n')}\nReturn JSON: {"hooks":[{"patternId","text","photo"}]} in the same order.`, meter, 'OpenAI bank hook fix', 6_000);
  (raw.hooks ?? []).forEach((h, i) => {
    if (failing[i] && typeof h?.text === 'string') Object.assign(failing[i]!, toDraft(h, meat, brand));
  });
};

const judge = async (passed: Draft[], meat: BankMeat, meter: CostMeter) => {
  if (passed.length === 0) return;
  const raw = await ask(JUDGE_SYSTEM, `${describeMeat(meat)}\n\nHOOKS:\n${passed.map((h, i) => `${i}. ${h.text}`).join('\n')}`, meter, 'OpenAI bank hook judge', 3_000);
  for (const s of Array.isArray(raw.scores) ? (raw.scores as Record<string, unknown>[]) : []) {
    const h = passed[Number(s.i)];
    const axes = [s.curiosity, s.clarity, s.fit].map(Number);
    if (h && axes.every(Number.isFinite)) Object.assign(h, { score: axes.reduce((a, b) => a + b, 0), minAxis: Math.min(...axes) });
  }
};

/** The best judged drafts, one per pattern. */
export const keepBest = (drafts: Draft[], limit = HOOKS_PER_MEAT): Draft[] => {
  const seen = new Set<string>();
  return drafts
    .filter((h) => h.problems.length === 0 && (h.score ?? 0) >= MIN_SCORE && (h.minAxis ?? 0) >= MIN_AXIS)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .filter((h) => !seen.has(h.patternId) && Boolean(seen.add(h.patternId)))
    .slice(0, limit);
};

const round = async (brief: string, meat: BankMeat, brand: string, meter: CostMeter): Promise<Draft[]> => {
  const system = HOOK_SYSTEM.replace('{NUMBER_RULE}', numberRule(meat));
  const context = `${brief}\n\n${describeMeat(meat)}`;
  const raw = await ask(system, `${context}\n\nHOOK LIBRARY (id [category] pattern):\n${shortlistText()}`, meter, 'OpenAI bank hooks', 8_000);
  const drafts = (raw.hooks ?? []).slice(0, HOOK_COUNT).map((h) => toDraft(h, meat, brand));
  await repair(drafts.filter((h) => h.problems.length > 0), system, context, meat, brand, meter);
  await judge(drafts.filter((h) => h.problems.length === 0), meat, meter);
  return keepBest(drafts);
};

export const writeHooks = async (brief: string, meat: BankMeat, brand: string, meter: CostMeter): Promise<BankHook[]> => {
  let kept = await round(brief, meat, brand, meter);
  if (kept.length < MIN_HOOKS) {
    const second = await round(brief, meat, brand, meter);
    if (second.length > kept.length) kept = second;
  }
  return kept.map((h, i) => ({
    id: `${meat.id}h${i + 1}`,
    meatId: meat.id,
    patternId: h.patternId,
    category: libraryHook(h.patternId)?.category ?? 'other',
    text: h.text,
    photo: h.photo,
    score: h.score ?? 0,
  }));
};
