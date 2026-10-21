// server-only — never import from a 'use client' file.
// A campaign's Schedule puts its posts on the workspace Calendar, where they wait for the usual approval (account,
// platforms, TikTok's choices). The times are kept on the campaign by slideshow position, so a remake keeps them.

import { prisma } from '../../../lib/db';
import type { CampaignCalendarDto, CampaignPlanItem } from '../../../types/admin/slideshowCampaign';
import { HttpError } from '../../http';
import type { UserAccess } from '../access';
import { SHOW_INCLUDE, toSlideshowDto } from '../store';
import { CAMPAIGN_KIND, isRendered, loadCampaign, planOf, storePlan } from './store';
import { campaignWaiting } from './waiting';

const LIVE = ['scheduled', 'sending', 'processing', 'posted'];

const parseItems = (value: unknown, count: number, now: Date): CampaignPlanItem[] => {
  if (!Array.isArray(value) || value.length === 0) throw new HttpError(400, 'bad_plan', 'Pick when each post goes out.');
  return value.map((raw) => {
    const item = (raw ?? {}) as { position?: unknown; at?: unknown };
    const position = Number(item.position);
    const at = typeof item.at === 'string' ? new Date(item.at) : null;
    if (!Number.isInteger(position) || position < 0 || position >= count) throw new HttpError(400, 'bad_plan', 'That post is not part of this campaign.');
    if (!at || Number.isNaN(at.getTime())) throw new HttpError(400, 'bad_time', 'Every post needs a time.');
    if (at <= now) throw new HttpError(400, 'past_time', 'One time is in the past. Pick a later time.');
    return { position, at: at.toISOString() };
  });
};

/**
 * Puts the campaign's posts at `items` on the Calendar (replacing earlier times of the same posts). The slideshows must
 * be made from the current draft (the client makes them first) and not scheduled yet. Returns the whole plan.
 */
export const planCampaign = async (access: UserAccess, id: string, items: unknown): Promise<CampaignPlanItem[]> => {
  const run = await loadCampaign(access, id);
  const shows = await prisma.autoSlideshow.findMany({ where: { runId: id }, select: { position: true, posts: { select: { status: true } } } });
  if (!isRendered(run, shows.length)) throw new HttpError(409, 'campaign_stale', 'The slideshows changed. Tap Schedule again to make them first.');
  const now = new Date();
  const next = parseItems(items, shows.length, now);
  const live = new Set(shows.filter((s) => s.posts.some((p) => LIVE.includes(p.status))).map((s) => s.position));
  if (next.some((p) => live.has(p.position))) throw new HttpError(409, 'already_scheduled', 'That post is already scheduled.');
  const positions = new Set(next.map((p) => p.position));
  const plan = [...planOf(run, now).filter((p) => !positions.has(p.position)), ...next].sort((a, b) => a.position - b.position);
  await prisma.autoSlideshowRun.update({ where: { id }, data: { campaign: storePlan(run, plan) } });
  return plan;
};

/**
 * The workspace's campaign posts for the Calendar: slideshows waiting there for approval (with their planned time) and
 * the ones already scheduled or posted. Other campaign slideshows stay off the Calendar.
 */
export const campaignCalendar = async (workspaceId: string): Promise<CampaignCalendarDto> => {
  const runs = await prisma.autoSlideshowRun.findMany({
    where: { workspaceId, kind: CAMPAIGN_KIND },
    select: { id: true, campaign: true, photos: true, slideshows: { orderBy: { position: 'asc' }, include: SHOW_INCLUDE } },
  });
  const planned: Record<string, string> = {};
  const campaignOf: Record<string, string> = {};
  const picked = runs.flatMap((run) => {
    const plan = new Map(planOf(run).map((p) => [p.position, p.at]));
    return run.slideshows.filter((show) => {
      const isLive = show.posts.some((p) => LIVE.includes(p.status));
      const at = plan.get(show.position);
      if (!isLive && at && show.status === 'ready') planned[show.id] = at;
      const shown = isLive || planned[show.id] !== undefined;
      if (shown) campaignOf[show.id] = run.id;
      return shown;
    });
  });
  return {
    slideshows: await Promise.all(picked.map(toSlideshowDto)),
    planned,
    campaignOf,
    waiting: await campaignWaiting(runs),
  };
};
