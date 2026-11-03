// server-only — never import from a 'use client' file.
// A Prospect Pack's posts on its workspace's calendar, the one place the admin reviews them: Blitz ideas (kept, at their
// time), Brand Cast slideshows (their pin) and Hooks Volume slideshows (the campaign's plan). The pack's days are written
// to the calendar once made, and read back from it on "Generate calendar", so a post moved there moves on the link too.
// A video put on the calendar during review ("Add to calendar") is a scheduled post: it counts as a day too.

import type { Prisma, ProspectPack } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { AutoSlide } from '../../types/admin/autoSlideshow';
import { BLITZ_LIVE } from '../../types/admin/blitzSchedule';
import type { ProspectDay } from '../../types/admin/prospects';
import { planOf, storePlan } from '../autoSlideshow/campaign/store';
import { blitzDaysFrom, daysFromPlan } from './days';
import { blitzOf } from './store';

const NEVER = new Date(0);

/** A scheduled post that can still change day. */
const POST_MOVABLE = ['planned', 'scheduled'];

type Pack = Pick<ProspectPack, 'id' | 'workspaceId' | 'blitz' | 'brandRunId' | 'hooksRunId' | 'days'>;

/** The Hooks Volume campaign's plan, by slideshow position. */
const planHooks = async (pack: Pack, days: ProspectDay[]): Promise<void> => {
  if (!pack.hooksRunId) return;
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: pack.hooksRunId }, select: { campaign: true, slideshows: { select: { id: true, position: true } } } });
  if (!run) return;
  const position = new Map(run.slideshows.map((s) => [s.id, s.position]));
  const plan = days.flatMap((d) => {
    const at = position.get(d.refId);
    return d.kind === 'hooks' && at !== undefined ? [{ position: at, at: d.at }] : [];
  });
  await prisma.autoSlideshowRun.update({ where: { id: pack.hooksRunId }, data: { campaign: storePlan(run, plan) as Prisma.InputJsonValue } });
};

/** The ideas of this workspace made into a scheduled post, and when each one posts. */
export const postedIdeas = async (workspaceId: string): Promise<Map<string, string>> => {
  const rows = await prisma.blitzScheduledPost.findMany({ where: { workspaceId, status: { in: BLITZ_LIVE }, variantId: { not: null } }, select: { variantId: true, scheduledAt: true } });
  return new Map(rows.map((r) => [r.variantId!, r.scheduledAt.toISOString()]));
};

/** Every post at its planned time, one a day. Ideas the pack does not post leave the calendar. An idea with a scheduled
 *  post stays 'made': only its post and its day move. */
export const putOnCalendar = async (pack: Pack, days: ProspectDay[]): Promise<void> => {
  const picked = blitzOf(pack);
  const posted = await postedIdeas(pack.workspaceId);
  const ideaOf = (refId: string) => picked.find((b) => b.ideaId === refId || b.projectId === refId)?.ideaId ?? (posted.has(refId) ? refId : undefined);
  const ideas = days.flatMap((d) => {
    const ideaId = d.kind === 'blitz' ? ideaOf(d.refId) : undefined;
    return ideaId ? [{ ideaId, at: new Date(d.at) }] : [];
  });
  await prisma.$transaction([
    prisma.slideshowVariant.updateMany({
      where: { workspaceId: pack.workspaceId, engine: 'website', status: { in: ['proposed', 'kept'] }, plannedAt: { not: null }, id: { notIn: ideas.map((i) => i.ideaId) } },
      data: { plannedAt: null, status: 'proposed' },
    }),
    ...ideas.map((i) => prisma.slideshowVariant.update({ where: { id: i.ideaId }, data: posted.has(i.ideaId) ? { plannedAt: i.at } : { plannedAt: i.at, status: 'kept' } })),
    ...ideas.filter((i) => posted.has(i.ideaId)).map((i) => prisma.blitzScheduledPost.updateMany({ where: { workspaceId: pack.workspaceId, variantId: i.ideaId, status: { in: POST_MOVABLE } }, data: { scheduledAt: i.at } })),
    ...days.filter((d) => d.kind === 'cast').map((d) => prisma.autoSlideshow.update({ where: { id: d.refId }, data: { plannedAt: new Date(d.at) } })),
  ]);
  await planHooks(pack, days);
};

/** Blitz days as they stand: videos and previews whose idea is still kept on the calendar, and ideas made into a post. */
const blitzItems = async (pack: Pack): Promise<Array<Omit<ProspectDay, 'day'>>> => {
  const picked = blitzOf(pack);
  const [rows, posted] = await Promise.all([
    prisma.slideshowVariant.findMany({ where: { id: { in: picked.map((b) => b.ideaId) }, status: 'kept', plannedAt: { not: null } }, select: { id: true, plannedAt: true } }),
    postedIdeas(pack.workspaceId),
  ]);
  return blitzDaysFrom(picked, new Map(rows.map((r) => [r.id, r.plannedAt!.toISOString()])), posted);
};

/** Brand Cast days: ready slideshows and previews with a first slide, at their pin or else the day they had. */
const castItems = async (pack: Pack, before: Map<string, string>): Promise<Array<Omit<ProspectDay, 'day'>>> => {
  if (!pack.brandRunId) return [];
  const run = await prisma.autoSlideshowRun.findUnique({
    where: { id: pack.brandRunId },
    select: { coverOnlyPositions: true, slideshows: { select: { id: true, position: true, status: true, plannedAt: true, slides: true } } },
  });
  return (run?.slideshows ?? []).flatMap((s) => {
    const preview = s.status === 'written' && run!.coverOnlyPositions.includes(s.position) && !!(s.slides as unknown as AutoSlide[] | null)?.[0]?.imageKey;
    const at = s.plannedAt?.toISOString() ?? before.get(s.id);
    if (!at || (s.status !== 'ready' && !preview)) return [];
    return [{ at, kind: 'cast' as const, refId: s.id, ...(preview ? { preview: true } : {}) }];
  });
};

/** Hooks Volume days: the campaign's ready slideshows at their planned time, even a time already gone. */
const hooksItems = async (pack: Pack): Promise<Array<Omit<ProspectDay, 'day'>>> => {
  if (!pack.hooksRunId) return [];
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: pack.hooksRunId }, select: { campaign: true, slideshows: { where: { status: 'ready' }, select: { id: true, position: true } } } });
  if (!run) return [];
  const at = new Map(planOf(run, NEVER).map((p) => [p.position, p.at]));
  return run.slideshows.flatMap((s) => {
    const time = at.get(s.position);
    return time ? [{ at: time, kind: 'hooks' as const, refId: s.id }] : [];
  });
};

/** The pack's days as the calendar has them now. */
export const daysFromCalendar = async (pack: Pack): Promise<ProspectDay[]> => {
  const before = new Map(((pack.days as unknown as ProspectDay[] | null) ?? []).map((d) => [d.refId, d.at]));
  const [blitz, cast, hooks] = await Promise.all([blitzItems(pack), castItems(pack, before), hooksItems(pack)]);
  return daysFromPlan([...blitz, ...cast, ...hooks]);
};
