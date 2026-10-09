// server-only — never import from a 'use client' file.
// The admin workspace page's Blitz Matrix tab: every Blitz Script Bank the workspace's site profiles have, with each
// story's lines and hooks and the idea cards the workspace got from it, plus the calendar plan of its ideas (day by day).

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { BlitzBankDto, BlitzBankMatrixDto, BlitzLearningDto, BlitzStoryCardDto, CampaignTriggerListDto, LearnedScoreDto } from '../../types/admin/workspaceDetail';
import { loadLearning, type BlitzLearning, type LearnedScore } from '../labs/blitzLearning';
import { ARCHETYPE_LABELS } from '../slideshow/core/deckAssembly';
import type { HookArchetype } from '../slideshow/core/types';
import { TRIGGER_KINDS, TRIGGER_LABELS } from '../labs/blitzFormats';
import type { BlitzBankContent } from '../labs/blitzBank';
import { beatLabels, cardText, formatLabel, stageLabel, type CardShotText } from './blitzCardText';
import { stageOf } from '../labs/blitzBank';
import { ideaPlan } from './ideaPlan';

const LINE_LABELS: Array<[keyof BlitzBankContent['audiences'][number]['stories'][number]['story'], string]> = [
  ['pain', 'Pain'],
  ['oldWay', 'Old way'],
  ['mechanism', 'Mechanism'],
  ['proof', 'Proof'],
  ['inaction', 'Cost of waiting'],
  ['cta', 'Call to action'],
];

type CardRow = {
  id: string;
  status: string;
  planned_at: Date | null;
  created_at: Date;
  story_id: string;
  archetype: string;
  shots: CardShotText[] | null;
  other_hooks: Array<{ text?: string }> | null;
  format: string | null;
};

/** The workspace's Blitz cards made from bank stories (calendar ideas save their script), by story, oldest first. */
async function storyCards(workspaceId: string): Promise<Map<string, BlitzStoryCardDto[]>> {
  const rows = await prisma.$queryRaw<CardRow[]>(Prisma.sql`
    SELECT id, status, planned_at, created_at, plan->'card'->'script'->>'storyId' AS story_id,
      COALESCE(plan->'card'->'script'->>'archetype', archetype) AS archetype, plan->'card'->'shots' AS shots,
      plan->'card'->'script'->'otherHooks' AS other_hooks, plan->'card'->'script'->>'format' AS format
    FROM slideshow_variants
    WHERE workspace_id = ${workspaceId} AND engine = 'website' AND plan->'card'->'script'->>'storyId' IS NOT NULL
    ORDER BY created_at ASC`);
  const byStory = new Map<string, BlitzStoryCardDto[]>();
  for (const r of rows) {
    const card: BlitzStoryCardDto = {
      id: r.id,
      archetype: r.archetype,
      status: r.status,
      plannedAt: r.planned_at?.toISOString() ?? null,
      createdAt: r.created_at.toISOString(),
      ...cardText(r.shots, r.format),
      otherHooks: (r.other_hooks ?? []).flatMap((h) => (h.text ? [h.text] : [])),
    };
    byStory.set(r.story_id, [...(byStory.get(r.story_id) ?? []), card]);
  }
  return byStory;
}

/** The audience's trigger bank, each line marked when a story is about it. */
const triggerLists = (a: BlitzBankContent['audiences'][number]): CampaignTriggerListDto[] => {
  const used = new Set(a.stories.map((s) => (s.trigger ?? '').toLowerCase()));
  return TRIGGER_KINDS.flatMap((k) => {
    const items = (a.triggers?.[k] ?? []).map((text) => ({ text, used: used.has(text.toLowerCase()) }));
    return items.length ? [{ label: TRIGGER_LABELS[k], items }] : [];
  });
};

const scores = (map: Map<string, LearnedScore>, label: (k: string) => string): LearnedScoreDto[] =>
  [...map].map(([k, v]) => ({ label: label(k), score: Math.round(v.score * 100) / 100, cards: v.cards })).sort((a, b) => b.score - a.score);

const learningDto = (l: BlitzLearning, storyNo: Map<string, number>): BlitzLearningDto => ({
  kept: l.kept,
  skipped: l.skipped,
  posted: l.posted,
  medianViews: l.medianViews,
  formats: scores(l.format, (k) => formatLabel(k) || k),
  hooks: scores(l.archetype, (k) => ARCHETYPE_LABELS[k as HookArchetype] ?? k),
  winners: l.winners.map((w) => ({ story: storyNo.has(w.storyId) ? `Story ${storyNo.get(w.storyId)}` : 'Old story', views: w.views, ratio: Math.round(w.ratio * 10) / 10 })),
});

/** "Story n" of each bank story, numbered per audience as the tab lists them. */
const storyNumbers = (contents: Array<BlitzBankContent | null>): Map<string, number> =>
  new Map(contents.flatMap((c) => (c?.audiences ?? []).flatMap((a) => a.stories.map((s, i): [string, number] => [s.id, i + 1]))));

export const blitzBankMatrix = async (workspaceId: string): Promise<BlitzBankMatrixDto> => {
  const runs = await prisma.studioRun.findMany({ where: { workspaceId }, distinct: ['brandProfileId'], select: { brandProfileId: true } });
  const profileIds = runs.map((r) => r.brandProfileId);
  const [banks, profiles, cardsOf] = await Promise.all([
    prisma.blitzScriptBank.findMany({ where: { brandProfileId: { in: profileIds } }, orderBy: { updatedAt: 'desc' } }),
    prisma.studioBrandProfile.findMany({ where: { id: { in: profileIds } }, select: { id: true, sourceUrl: true } }),
    storyCards(workspaceId),
  ]);
  const urlOf = new Map(profiles.map((p) => [p.id, p.sourceUrl]));
  const storyNo = storyNumbers(banks.map((b) => b.content as unknown as BlitzBankContent | null));
  return {
    plan: await ideaPlan(workspaceId, storyNo),
    learning: learningDto(await loadLearning(workspaceId), storyNo),
    banks: banks.map((b): BlitzBankDto => {
      const content = b.content as unknown as BlitzBankContent | null;
      return {
        id: b.id,
        sourceUrl: urlOf.get(b.brandProfileId) ?? '',
        status: b.status,
        error: b.error,
        costMicros: b.costMicros,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        audiences: (content?.audiences ?? []).map((a) => ({
          idc: a.idc,
          categories: a.categories,
          tone: a.tone,
          proofNote: a.proofNote,
          objective: a.goal?.objective ?? '',
          action: a.goal?.action ?? '',
          triggers: triggerLists(a),
          stories: a.stories.map((s) => ({
            id: s.id,
            stage: stageLabel(stageOf(s)),
            format: formatLabel(s.format ?? 'problem_fix'),
            trigger: s.trigger ?? '',
            lines: LINE_LABELS.map(([key, label]) => ({ label: key === 'cta' ? label : beatLabels(s.format)[key], text: s.story[key] })),
            hooks: s.hooks,
            used: cardsOf.get(s.id)?.length ?? 0,
            cards: cardsOf.get(s.id) ?? [],
          })),
        })),
      };
    }),
  };
};
