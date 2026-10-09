// server-only — never import from a 'use client' file.
//
// The campaign behind a workspace's Blitz ideas. Per audience of the site, written once into its Blitz Script Bank:
// the commercial goal, the one action a viewer should take, and a trigger bank (pains, mistakes, desired outcomes,
// questions, objections, beliefs that fail them, reasons to choose) that the stories are about, each format from its own list.
// Per workspace: a 28-day campaign that starts on its first planned idea; a batch's quotas follow the campaign weeks
// its days fall in (blitzFormats.ts).

import { prisma } from '../../lib/db';
import { chatJsonWithMeta } from '../ai/openai';
import type { WebsiteBrief } from '../slideshow/engines/website/engine';
import { CAMPAIGN_DAYS, TRIGGER_KINDS, WEEK_MIX, type TriggerKind } from './blitzFormats';

export type TriggerBank = Record<TriggerKind, string[]>;
export type CampaignGoal = { objective: string; action: string };

/** Triggers per list: enough for several campaigns before a list runs dry (then stories pick their own). */
const PER_KIND = 8;
const DAY_MS = 86_400_000;

const KIND_ASK: Record<TriggerKind, string> = {
  pains: 'concrete problems they have that the business solves, each a moment from their day',
  mistakes: 'common mistakes they make that the business fixes, each something they do ("You buy…")',
  desires: 'outcomes they want, each a concrete moment once the problem is solved',
  questions: 'questions they ask (or type in search) about doing this better',
  objections: 'doubts that stop them from trying this business, in their words',
  myths: 'beliefs they hold that are wrong and cost them (no "myth" word)',
  reasons: 'reasons to choose this business over doing nothing or another way, from the profile only',
};

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim()) : [];

/** One call: the audience's goal, action and trigger bank. Lists come back empty when the call fails. */
export async function writeTriggerBank(brief: WebsiteBrief): Promise<{ goal: CampaignGoal; triggers: TriggerBank }> {
  const b = brief.business;
  const prompt = `You plan a 28-day short-video campaign that turns strangers among ${brief.idc} into customers of the business below.

BUSINESS
- Name: ${b.name}
- What it is: ${b.promoting}
- Core promise: ${b.offer}
- What makes it different: ${b.positioning}
${b.description ? `- Description: ${b.description}\n` : ''}${brief.audienceDescription ? `- Typical customer: ${brief.audienceDescription}\n` : ''}${b.howToBuy ? `- How customers buy: ${b.howToBuy}\n` : ''}${brief.proofPoints.length ? `- Proof: ${brief.proofPoints.map((p) => p.claim).join('; ')}\n` : ''}
TASK
- objective: the commercial result this campaign is for, one short sentence.
- action: the one thing a ready viewer should do (from "How customers buy" or the profile), max 7 words.
${TRIGGER_KINDS.map((k) => `- ${k}: ${PER_KIND} ${KIND_ASK[k]}.`).join('\n')}

RULES
- Every line about a different situation, cause or cost. Never the same thing with another object.
- One short sentence each, max 12 words, plain words, in ${brief.idc}'s own words (reasons: plain facts).
- Only what follows from the business above. No numbers that the profile does not print.

OUTPUT: JSON only, flat. {"objective": "...", "action": "...", ${TRIGGER_KINDS.map((k) => `"${k}": ["..."]`).join(', ')}}`;
  const { result } = await chatJsonWithMeta<Record<string, unknown>>(
    [{ role: 'system', content: prompt }, { role: 'user', content: 'Write the JSON now.' }],
    { maxTokens: 6000, temperature: 0.7, model: 'gpt-5.5', reasoningEffort: 'low', timeoutMs: 60_000 },
  ).catch((err: unknown) => {
    console.error(`[BlitzCampaign:${brief.idc}] trigger bank failed:`, err instanceof Error ? err.message : err);
    return { result: null };
  });
  const triggers = Object.fromEntries(TRIGGER_KINDS.map((k) => [k, strings(result?.[k]).slice(0, PER_KIND)])) as TriggerBank;
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return { goal: { objective: text(result?.objective), action: text(result?.action) }, triggers };
}

/** The workspace's campaign start: the day of its first planned idea (Blitz or slideshow), else `fallback`. */
export async function campaignStart(workspaceId: string, fallback: Date): Promise<Date> {
  const first = await prisma.slideshowVariant.findFirst({
    where: { workspaceId, plannedAt: { not: null }, engine: { in: ['website', 'bank'] } },
    orderBy: { plannedAt: 'asc' },
    select: { plannedAt: true },
  });
  return first?.plannedAt ?? fallback;
}

/** The campaign week (0–3) a day falls in; campaigns repeat every CAMPAIGN_DAYS. */
export const campaignWeek = (day: Date, start: Date): number => {
  // Calendar days (UTC), not 24-hour spans: a time earlier on the start's day is still day 0.
  const days = Math.floor(day.getTime() / DAY_MS) - Math.floor(start.getTime() / DAY_MS);
  return Math.floor((((days % CAMPAIGN_DAYS) + CAMPAIGN_DAYS) % CAMPAIGN_DAYS) / 7) % WEEK_MIX.length;
};
