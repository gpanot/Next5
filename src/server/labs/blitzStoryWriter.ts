// server-only — never import from a 'use client' file.
//
// Blitz Script Bank stories for one audience in a few calls, instead of 3 calls per story (2026-10-13 blind test on
// 20 stories: judged better 16 times out of 20, about 3× cheaper):
//   1. one call writes every story (each slot: its stage's CTA and its format's beats), checked by the same rules as a
//      single story (meatCheck.ts); one more call fixes the stories that broke a hard rule, the rest are dropped
//   2. then hooks (generateStoryHooks, HOOK_GROUP stories a call, in parallel)
// A story is handed to `onReady` as soon as its hooks are written. Photo prompts are not written here: the bank writes
// them right after (blitzBank.ts backfillPhotos), one batch ahead of the deck.
// Value content, not ads (2026-10-20): a story or hook that pitches before the CTA is fixed or dropped (blitzPitchGuard.ts).

import { chatJsonWithMeta } from '../ai/openai';
import { contentWords, noEmDash } from '../slideshow/core/copyGuards';
import type { StoryTexts } from '../slideshow/core/deckAssembly';
import { generateStoryHooks } from '../slideshow/core/hooks';
import { LENGTH_ERROR_PREFIX, checkMeatDraft } from '../slideshow/core/meatCheck';
import type { HookArchetype } from '../slideshow/core/types';
import { websiteEngine, type WebsiteBrief } from '../slideshow/engines/website/engine';
import { lineGuard } from '../slideshow/engines/website/guardrails';
import { buildWebsiteStoriesPrompt, type StoryPromptSlot } from '../slideshow/engines/website/prompts';
import { FORMAT_DEFS, STAGE_CTA, type Stage, type StoryFormat } from './blitzFormats';
import { pitchGuard } from './blitzPitchGuard';
import { hookClaimIsProven } from './websiteDeck';

export type WriteSlot = { stage: Stage; format: StoryFormat; followUpOf?: string; /** A follow-up's chosen problem. */ problem?: string };
export type WrittenStory = { slot: WriteSlot; problem: string; story: StoryTexts; hooks: Array<{ archetype: HookArchetype; text: string }> };

type WriteInput = {
  brief: WebsiteBrief;
  slots: WriteSlot[];
  /** Problems the bank already tells. */
  avoid: string[];
  onReady: (story: WrittenStory) => void;
};

/** Stories per hook call: small enough to answer in about 20-30 s each, all in parallel. */
const HOOK_GROUP = 5;

type RawStory = Partial<Record<keyof StoryTexts | 'problem', unknown>> & { slot?: unknown };
type Draft = { slot: WriteSlot; problem: string; story: StoryTexts };

const LABEL = /^\s*(pain|old ?way|mechanism|proof|inaction|cta|line \d)\s*[:=]\s*/i;
const text = (v: unknown) => (typeof v === 'string' ? noEmDash(v.replace(LABEL, '').trim()) : '');
const toStory = (r: RawStory): StoryTexts => ({ pain: text(r.pain), oldWay: text(r.oldWay), mechanism: text(r.mechanism), proof: text(r.proof), inaction: text(r.inaction), cta: text(r.cta) });
const slotIndex = (r: RawStory) => Number(String(r.slot ?? '').replace(/\D/g, '')) - 1;
const groups = <T>(items: T[], size: number): T[][] => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

const askStories = async (system: string, user: string, count: number): Promise<RawStory[]> => {
  const ask = () => chatJsonWithMeta<{ stories?: RawStory[] }>([{ role: 'system', content: system }, { role: 'user', content: user }],
    { model: 'gpt-5.5', reasoningEffort: 'low', maxTokens: 3_000 + count * 400, timeoutMs: 150_000 });
  let { result } = await ask();
  if (!Array.isArray(result?.stories) || result.stories.length === 0) ({ result } = await ask());
  return result?.stories ?? [];
};

/** Story lines that must not pitch: every one but the CTA. */
const VALUE_LINES = ['pain', 'oldWay', 'mechanism', 'proof', 'inaction'] as const;

/** Lines 1–5 that pitch the business (name, app, ratings, press), as errors the fix call can read. */
const pitchErrors = (d: Draft, brief: WebsiteBrief) => {
  const guard = pitchGuard(brief.business.name);
  return VALUE_LINES.flatMap((key) => {
    const reason = guard(d.story[key]);
    return reason ? [`${key} ${reason}: rewrite it as pure value, no business, product, app or reviews.`] : [];
  });
};

/** Errors that block a story (a number not on the site, a claim, an empty line, a pitch before the CTA); a line only
 *  too long is kept for the editor. */
const hardErrors = (d: Draft, brief: WebsiteBrief) => [
  ...checkMeatDraft(d.story, d.story.cta, lineGuard(brief.facts)).filter((e) => !e.startsWith(LENGTH_ERROR_PREFIX)),
  ...pitchErrors(d, brief),
];

/** Step 1: every story in one call, then one call to fix the ones that broke a hard rule. */
async function writeDrafts(brief: WebsiteBrief, slots: WriteSlot[], avoid: string[]): Promise<Draft[]> {
  const promptSlots: StoryPromptSlot[] = slots.map((s) => ({
    problemKind: FORMAT_DEFS[s.format].trigger, problem: s.problem, beats: Object.values(FORMAT_DEFS[s.format].beats), cta: STAGE_CTA[s.stage],
  }));
  const system = buildWebsiteStoriesPrompt(brief, promptSlots, avoid);
  const drafts: Array<Draft | null> = slots.map(() => null);
  const take = (rows: RawStory[]) => rows.forEach((r) => {
    const i = slotIndex(r);
    if (slots[i]) drafts[i] = { slot: slots[i]!, problem: text(r.problem) || slots[i]!.problem || '', story: toStory(r) };
  });
  take(await askStories(system, 'Write the JSON now.', slots.length));
  const broken = drafts.flatMap((d, i) => (d && hardErrors(d, brief).length > 0 ? [i] : []));
  if (broken.length > 0) {
    const mine = drafts.map((d, i) => (d ? { slot: i + 1, problem: d.problem, ...d.story } : null)).filter(Boolean);
    const errors = broken.map((i) => `slot ${i + 1}: ${hardErrors(drafts[i]!, brief).join(' | ')}`).join('\n');
    const fix = `Your stories:\n${JSON.stringify(mine)}\n\nThese broke the rules:\n${errors}\n\nFor a number that is not in the profile: rewrite that line with no number at all. Rewrite ONLY those slots, fixing every error. Same JSON shape.`;
    take((await askStories(system, fix, broken.length)).filter((r) => broken.includes(slotIndex(r))));
  }
  return drafts.filter((d): d is Draft => d !== null && hardErrors(d, brief).length === 0 && Boolean(d.story.pain));
}

/** Writes the stories for `slots`; each reaches `onReady` once its hooks are written. Never throws for one story. */
export async function writeStories({ brief, slots, avoid, onReady }: WriteInput): Promise<void> {
  if (slots.length === 0) return;
  const t0 = Date.now();
  const drafts = await writeDrafts(brief, slots, avoid);
  const ids = drafts.map((_, i) => `w${i}`);
  // Hooks get no proof quote and drop result-first: a hook never cites the business's ratings or press.
  const base = websiteEngine.hookRules(brief);
  const rules = {
    ...base,
    droppedArchetypes: [...(base.droppedArchetypes ?? []), 'proof_result' as const],
    extraInstruction: `${base.extraInstruction ?? ''} Never name the business or its product, never say "app", and never cite ratings, reviews or press: the video is value content, not an ad.`.trim(),
  };
  const pitches = pitchGuard(brief.business.name);
  const hookInput = { audience: brief.idc, proofLine: null, lensLine: brief.idcEvidence ? `Site says: "${brief.idcEvidence}"` : undefined, rules };
  const hookStories = drafts.map((d, i) => ({ id: ids[i]!, lines: Object.values(d.story).join(' / '), specifics: [...contentWords(d.story.pain), ...contentWords(d.story.mechanism)] }));
  const hookCalls = groups(hookStories, HOOK_GROUP).map((g) => generateStoryHooks(hookInput, g));
  await Promise.all(drafts.map(async (d, i) => {
    const hooks = await hookCalls[Math.floor(i / HOOK_GROUP)]!;
    const kept = (hooks.get(ids[i]!) ?? []).filter((h) => hookClaimIsProven(h.text, brief.proofPoints) && !pitches(h.text)).map((h) => ({ ...h, text: noEmDash(h.text) }));
    if (kept.length === 0) return;
    onReady({ slot: d.slot, problem: d.problem, story: d.story, hooks: kept });
  }));
  console.log(`[BlitzWriter] ${brief.idc}: ${drafts.length}/${slots.length} stories in ${Date.now() - t0}ms`);
}
