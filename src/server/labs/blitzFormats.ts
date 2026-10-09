// server-only — never import from a 'use client' file.
//
// Campaign stages and story formats of Blitz videos (stranger → customer). A 28-day campaign has four weeks, each
// with a focus, and every week mixes the four stages (offers run in all of them):
//   week 1 attention  — the right people stop ("that's me")
//   week 2 trust      — something useful, shown well ("they know this")
//   week 3 proof      — results and before/after ("could work for me")
//   week 4 conversion — the offer, doubts answered ("I should try it")
// A 14-day batch takes the stage mix of the two campaign weeks it covers. A format says what each of a video's 5 story
// beats tells (the shots keep their roles: beat 1 plays in the pain shot, beat 5 is always the bridge ending with ":"),
// which list of the campaign's trigger bank it is about, and what footage fits each beat; its stage sets the CTA.

import type { ContentGoal } from '../../types/admin/contentGoals';
import type { StoryTexts } from '../slideshow/core/deckAssembly';
import type { HookArchetype } from '../slideshow/core/types';

export const STAGES = ['attention', 'trust', 'proof', 'conversion'] as const;
export type Stage = (typeof STAGES)[number];

export const FORMATS = ['problem_fix', 'myth_truth', 'mistake', 'how_to', 'signs', 'before_after', 'objection', 'offer'] as const;
export type StoryFormat = (typeof FORMATS)[number];

type Beat = Exclude<keyof StoryTexts, 'cta'>;

/** Lists of a campaign's trigger bank (blitzCampaign.ts): what the business's stories can be about. */
export const TRIGGER_KINDS = ['pains', 'mistakes', 'desires', 'questions', 'objections', 'myths', 'reasons'] as const;
export type TriggerKind = (typeof TRIGGER_KINDS)[number];

export const TRIGGER_LABELS: Record<TriggerKind, string> = {
  pains: 'Pains', mistakes: 'Common mistakes', desires: 'Desired outcomes', questions: 'Questions', objections: 'Objections', myths: 'Beliefs that fail them', reasons: 'Reasons to choose',
};

export type FormatDef = {
  label: string;
  /** The trigger-bank list this format's stories are about. */
  kind: TriggerKind;
  /** What the trigger is for this format (written ahead, one per story). */
  trigger: string;
  /** Admin labels of beats 1–5. */
  labels: Record<Beat, string>;
  /** What each beat says, for the writer. */
  beats: Record<Beat, string>;
  /** Footage wanted behind each beat (library search). Absent = the beat's usual footage. */
  intents?: Partial<Record<Beat, string>>;
};

const PROOF_BEAT = 'proof: see PROOF above.';
const BRIDGE_BEAT = 'inaction: the cost of leaving THIS problem as it is, then a short bridge ending with ":". Do not repeat beat 1.';
const MECHANISM_RULE = 'Name the ONE thing the product does that fixes this exact problem. Never list everything it does.';

export const FORMAT_DEFS: Record<StoryFormat, FormatDef> = {
  problem_fix: {
    label: 'Problem → fix', kind: 'pains', trigger: 'a concrete problem they have',
    labels: { pain: 'Pain', oldWay: 'Old way', mechanism: 'Fix', proof: 'Proof', inaction: 'Cost of waiting' },
    beats: {
      pain: 'pain: the problem in their own words, a moment from their day.',
      oldWay: 'oldWay: how they cope with it today.',
      mechanism: `mechanism: what the product does about it. ${MECHANISM_RULE}`,
      proof: PROOF_BEAT, inaction: BRIDGE_BEAT,
    },
  },
  myth_truth: {
    label: 'Myth → truth', kind: 'myths', trigger: 'a belief they hold that is wrong and costs them',
    labels: { pain: 'Myth', oldWay: 'Why it fails', mechanism: 'Truth', proof: 'Proof', inaction: 'Cost of believing it' },
    beats: {
      pain: 'pain: the myth, said the way they believe it (no "myth" word).',
      oldWay: 'oldWay: why it fails them, one concrete result.',
      mechanism: `mechanism: what actually works, with the product. ${MECHANISM_RULE}`,
      proof: PROOF_BEAT, inaction: BRIDGE_BEAT,
    },
    intents: { pain: 'confident person doing it the usual way', oldWay: 'it goes wrong, disappointed' },
  },
  mistake: {
    label: 'Common mistake', kind: 'mistakes', trigger: 'a common mistake they make',
    labels: { pain: 'Mistake', oldWay: 'What it costs', mechanism: 'Better way', proof: 'Proof', inaction: 'Cost of waiting' },
    beats: {
      pain: 'pain: the mistake, as something they do ("You buy…").',
      oldWay: 'oldWay: what that mistake costs them (time, money, stress). No number unless printed in the profile.',
      mechanism: `mechanism: the better way, with the product. ${MECHANISM_RULE}`,
      proof: PROOF_BEAT, inaction: BRIDGE_BEAT,
    },
    intents: { pain: 'doing it wrong, small mistake at home or work', oldWay: 'annoyed, wasted, frustrated' },
  },
  how_to: {
    label: 'How-to', kind: 'questions', trigger: 'a task they want to do better',
    labels: { pain: 'Problem', oldWay: 'Step 1', mechanism: 'Step 2', proof: 'Proof', inaction: 'Why now' },
    beats: {
      pain: 'pain: the task and where it goes wrong, one line.',
      oldWay: 'oldWay: step 1, a useful tip they can do today with no product.',
      mechanism: `mechanism: step 2, the same job done with the product. ${MECHANISM_RULE}`,
      proof: PROOF_BEAT, inaction: BRIDGE_BEAT,
    },
    intents: { oldWay: 'hands doing a simple task, calm, step by step', mechanism: 'easy, organized, the task done well' },
  },
  signs: {
    label: 'Signs you need this', kind: 'pains', trigger: 'a situation with two clear warning signs',
    labels: { pain: 'Sign 1', oldWay: 'Sign 2', mechanism: 'Fix', proof: 'Proof', inaction: 'Cost of waiting' },
    beats: {
      pain: 'pain: sign 1 they need this, a small moment they will recognize.',
      oldWay: 'oldWay: sign 2, a different moment with the same cause.',
      mechanism: `mechanism: the fix. ${MECHANISM_RULE}`,
      proof: PROOF_BEAT, inaction: BRIDGE_BEAT,
    },
  },
  before_after: {
    label: 'Before → after', kind: 'desires', trigger: 'a day that changes once the problem is fixed',
    labels: { pain: 'Before', oldWay: 'The switch', mechanism: 'After', proof: 'Proof', inaction: 'Cost of waiting' },
    beats: {
      pain: 'pain: their day before, one concrete moment.',
      oldWay: 'oldWay: the switch, what they start doing with the product.',
      mechanism: `mechanism: their day after, the same moment now easy. ${MECHANISM_RULE}`,
      proof: PROOF_BEAT, inaction: BRIDGE_BEAT,
    },
    intents: { oldWay: 'starting something new, trying it, phone in hand', mechanism: 'relief, calm, happy, the same moment going well' },
  },
  objection: {
    label: 'Objection answered', kind: 'objections', trigger: 'a doubt that stops them from trying the product',
    labels: { pain: 'Doubt', oldWay: 'Why it makes sense', mechanism: 'Answer', proof: 'Proof', inaction: 'Cost of waiting' },
    beats: {
      pain: 'pain: the doubt in their words ("I don\'t have time to…").',
      oldWay: 'oldWay: why the doubt makes sense, said kindly.',
      mechanism: `mechanism: the answer, how the product removes that doubt. ${MECHANISM_RULE}`,
      proof: PROOF_BEAT, inaction: BRIDGE_BEAT,
    },
    intents: { pain: 'skeptical, unsure, thinking', oldWay: 'busy, hesitant' },
  },
  offer: {
    label: 'The offer', kind: 'reasons', trigger: 'the reason this audience should start now',
    labels: { pain: 'Who it is for', oldWay: 'What you get', mechanism: 'First win', proof: 'Proof', inaction: 'Why now' },
    beats: {
      pain: 'pain: who this is for, by the problem they have.',
      oldWay: 'oldWay: what they get: one benefit of the product, from the profile only. A gain, never a problem.',
      mechanism: 'mechanism: the first easy win right after they start.',
      proof: PROOF_BEAT, inaction: BRIDGE_BEAT,
    },
    intents: { oldWay: 'the product in use, clear and simple', mechanism: 'quick win, smiling, relieved' },
  },
};

/** Formats of a stage, in the order new stories rotate through them. */
export const STAGE_FORMATS: Record<Stage, StoryFormat[]> = {
  attention: ['problem_fix', 'myth_truth', 'mistake'],
  trust: ['how_to', 'signs'],
  proof: ['before_after', 'problem_fix'],
  conversion: ['objection', 'offer'],
};

/** What the CTA asks, by how ready the viewer is. Max 7 words. */
export const STAGE_CTA: Record<Stage, string> = {
  attention: 'a light ask: follow, save or comment (e.g. "Follow for more kitchen fixes"). No sale yet.',
  trust: 'ask them to save or share it (e.g. "Save this for your next shop").',
  proof: 'invite them to see it work, with the business name (e.g. "See how {name} works").',
  conversion: 'a direct ask with the business name and how they start (from "How customers buy", or "Try {name} today").',
};

/** Hook types that suit a stage, best first; a batch's cards rotate through them. */
export const STAGE_HOOKS: Record<Stage, HookArchetype[]> = {
  attention: ['call_out', 'contrarian', 'curiosity', 'fear_inaction'],
  trust: ['curiosity', 'action', 'call_out'],
  proof: ['proof_result', 'curiosity', 'call_out'],
  conversion: ['call_out', 'fear_inaction', 'contrarian', 'curiosity'],
};

/** Stories per stage in each week of the 28-day campaign (each week sums to 7, one a day). */
export const WEEK_MIX: Array<Record<Stage, number>> = [
  { attention: 4, trust: 2, proof: 0, conversion: 1 },
  { attention: 2, trust: 3, proof: 1, conversion: 1 },
  { attention: 1, trust: 2, proof: 3, conversion: 1 },
  { attention: 1, trust: 1, proof: 2, conversion: 3 },
];

export const WEEK_FOCUS = ['Get attention', 'Build trust', 'Prove it works', 'Convert'];

export const CAMPAIGN_DAYS = WEEK_MIX.length * 7;

const sumWeeks = (a: Record<Stage, number>, b: Record<Stage, number>): Record<Stage, number> =>
  ({ attention: a.attention + b.attention, trust: a.trust + b.trust, proof: a.proof + b.proof, conversion: a.conversion + b.conversion });

/** Unused stories the bank keeps per stage: enough for any two weeks in a row. */
export const STAGE_TARGET: Record<Stage, number> = WEEK_MIX.reduce((best, w, i) => {
  const pair = sumWeeks(w, WEEK_MIX[(i + 1) % WEEK_MIX.length]!);
  return { attention: Math.max(best.attention, pair.attention), trust: Math.max(best.trust, pair.trust), proof: Math.max(best.proof, pair.proof), conversion: Math.max(best.conversion, pair.conversion) };
}, { attention: 0, trust: 0, proof: 0, conversion: 0 });

/** The stage a slideshow idea plays in the mix, by its content goal. */
export const GOAL_STAGE: Record<ContentGoal, Stage> = { myth: 'attention', story: 'attention', teach: 'trust', proof: 'proof', product: 'conversion' };

export const isStage = (v: unknown): v is Stage => typeof v === 'string' && (STAGES as readonly string[]).includes(v);
export const isFormat = (v: unknown): v is StoryFormat => typeof v === 'string' && (FORMATS as readonly string[]).includes(v);

/** Sum of per-week quotas. */
export const totalQuota = (weeks: Array<Record<Stage, number>>): Record<Stage, number> =>
  weeks.reduce(sumWeeks, { attention: 0, trust: 0, proof: 0, conversion: 0 });

/**
 * The Blitz quotas of a batch, one per campaign week it covers (`firstWeek` and the next): each week's mix minus the
 * stages its slideshows already cover. A slideshow comes off the week with most of its stage, else the largest stage.
 */
export function batchQuotas(firstWeek: number, slideshowGoals: ContentGoal[]): Array<Record<Stage, number>> {
  const weeks = [0, 1].map((i) => ({ ...WEEK_MIX[(firstWeek + i) % WEEK_MIX.length]! }));
  for (const goal of slideshowGoals) {
    const stage = GOAL_STAGE[goal];
    const week = weeks.reduce((best, w) => (w[stage] > best[stage] ? w : best));
    if (week[stage] > 0) { week[stage] -= 1; continue; }
    const fullest = weeks.reduce((best, w) => (Math.max(...STAGES.map((s) => w[s])) > Math.max(...STAGES.map((s) => best[s])) ? w : best));
    const most = STAGES.reduce((best, s) => (fullest[s] > fullest[best] ? s : best));
    fullest[most] = Math.max(0, fullest[most] - 1);
  }
  return weeks;
}

/**
 * Day order of a batch's stages: neighbours differ when they can, no conversion in the first two days, and the
 * stage with the most left goes next. Returns indexes into `stages`.
 */
export function orderByStage(stages: Stage[]): number[] {
  const left = stages.map((s, i) => ({ s, i }));
  const out: number[] = [];
  let prev: Stage | null = null;
  while (left.length > 0) {
    const counts = new Map<Stage, number>();
    left.forEach(({ s }) => counts.set(s, (counts.get(s) ?? 0) + 1));
    const ok = (s: Stage) => s !== prev && !(out.length < 2 && s === 'conversion' && left.some((l) => l.s !== 'conversion'));
    const pool = left.some((l) => ok(l.s)) ? left.filter((l) => ok(l.s)) : left;
    const pick = pool.reduce((best, l) => ((counts.get(l.s) ?? 0) > (counts.get(best.s) ?? 0) ? l : best));
    out.push(pick.i);
    prev = pick.s;
    left.splice(left.indexOf(pick), 1);
  }
  return out;
}
