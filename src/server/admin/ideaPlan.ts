// server-only — never import from a 'use client' file.
// The admin's day-by-day view of a workspace's calendar ideas (Blitz cards and slideshows), with what each one says.
// Users never see this plan: their calendar only shows the ideas.

import { prisma } from '../../lib/db';
import { GOAL_LABELS, isContentGoal } from '../../types/admin/contentGoals';
import type { IdeaPlanItemDto } from '../../types/admin/workspaceDetail';
import type { BankIdeaPlan } from '../labs/bankIdeas';
import type { DeckItem } from '../slideshow/core/deckAssembly';
import { cardText, formatLabel, stageLabel } from './blitzCardText';
import { GOAL_STAGE, WEEK_FOCUS } from '../labs/blitzFormats';
import { campaignStart, campaignWeek } from '../labs/blitzCampaign';

/** How far back planned ideas still show (the days just posted). */
const SINCE_DAYS = 7;

type ItemBase = Pick<IdeaPlanItemDto, 'id' | 'plannedAt' | 'status' | 'week'>;

const blitzItem = (base: ItemBase, card: DeckItem | undefined, storyNo: Map<string, number>): IdeaPlanItemDto => {
  const script = card?.script;
  const storyId = script?.storyId;
  return {
    ...base,
    format: 'blitz',
    stage: script ? stageLabel(script.stage ?? 'attention') : '',
    storyFormat: script ? formatLabel(script.format ?? 'problem_fix') : '',
    kind: card?.hookStyle ?? '',
    story: storyId ? (storyNo.has(storyId) ? `Story ${storyNo.get(storyId)}` : 'Old story') : 'No bank story',
    ...cardText(card?.shots, script?.format),
    outline: [],
    otherHooks: (card?.script?.otherHooks ?? []).map((h) => h.text),
  };
};

/** Planned ideas from a week ago on, by day. `storyNo`: bank story id → its number in the tab. */
export async function ideaPlan(workspaceId: string, storyNo: Map<string, number>): Promise<IdeaPlanItemDto[]> {
  const rows = await prisma.slideshowVariant.findMany({
    where: { workspaceId, engine: { in: ['website', 'bank'] }, plannedAt: { gte: new Date(Date.now() - SINCE_DAYS * 86_400_000) } },
    orderBy: { plannedAt: 'asc' },
  });
  const start = await campaignStart(workspaceId, new Date());
  const weekOf = (at: Date) => {
    const week = campaignWeek(at, start);
    return `Week ${week + 1} · ${WEEK_FOCUS[week]}`;
  };
  return rows.map((r): IdeaPlanItemDto => {
    const base = { id: r.id, plannedAt: r.plannedAt!.toISOString(), status: r.status, week: weekOf(r.plannedAt!) };
    if (r.engine === 'website') return blitzItem(base, (r.plan as { card?: DeckItem }).card, storyNo);
    const plan = r.plan as unknown as BankIdeaPlan;
    return {
      ...base,
      format: 'slideshow',
      stage: isContentGoal(plan.goal) ? stageLabel(GOAL_STAGE[plan.goal]) : '',
      storyFormat: '',
      kind: isContentGoal(plan.goal) ? GOAL_LABELS[plan.goal] : '',
      story: '',
      hook: plan.hook ?? '',
      meat: [],
      cta: '',
      outline: plan.outline ?? [],
      otherHooks: [],
    };
  });
}
