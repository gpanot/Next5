// server-only — never import from a 'use client' file.
// Kept Blitz videos on the calendar: schedule, list, cancel. Scheduling saves the render request only; the tick
// (blitzScheduleTick.ts) renders and posts it near its time.

import type { BlitzScheduledPost, Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { BLITZ_LIVE, type BlitzScheduleDto, type BlitzScheduleStatus, type CalendarBusyDto, type ScheduleBlitzRequest } from '../../types/admin/blitzSchedule';
import { blitzBrowserUrl } from '../admin/blitzStore';
import { connectionFor } from '../autoSlideshow/posting';
import { HttpError } from '../http';
import { presignObject } from '../storage/objectStore';
import { requireCredits } from '../slideshowCredits/charge';
import type { RenderBody } from './blitzRender';

/** A post must be at least this far ahead, so the render has time to start. */
const MIN_AHEAD_MS = 10 * 60 * 1000;
/** Most a post can be scheduled ahead. */
const MAX_AHEAD_MS = 120 * 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 250_000;
const IMAGE_KEY = /\.(jpe?g|png|webp)$/i;

export const toScheduleDto = async (p: BlitzScheduledPost): Promise<BlitzScheduleDto> => ({
  id: p.id,
  cardId: p.cardId,
  title: p.title,
  coverUrl: p.coverKey && IMAGE_KEY.test(p.coverKey) ? await blitzBrowserUrl(p.coverKey) : null,
  scheduledAt: p.scheduledAt.toISOString(),
  status: p.status as BlitzScheduleStatus,
  postUrl: p.postUrl,
  error: p.error,
});

/** The workspace's scheduled videos from a year back, oldest first (canceled ones left out). */
export async function listSchedule(workspaceId: string): Promise<BlitzScheduleDto[]> {
  const rows = await prisma.blitzScheduledPost.findMany({
    where: { workspaceId, status: { not: 'canceled' }, scheduledAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
    orderBy: { scheduledAt: 'asc' },
  });
  return Promise.all(rows.map(toScheduleDto));
}

/** Auto Slideshow posts on the workspace's calendar from today on, for the picker's busy days. */
export async function listBusy(workspaceId: string): Promise<CalendarBusyDto[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const posts = await prisma.autoSlideshowPost.findMany({
    where: { workspaceId, status: { in: ['scheduled', 'sending', 'processing', 'posted'] }, scheduledAt: { gte: start } },
    select: { scheduledAt: true, slideshow: { select: { topic: true, slides: true } } },
    orderBy: { scheduledAt: 'asc' },
  });
  return Promise.all(posts.map(async (p) => {
    const key = (p.slideshow.slides as Array<{ imageKey?: string | null }>)[0]?.imageKey;
    return { scheduledAt: p.scheduledAt.toISOString(), title: p.slideshow.topic, coverUrl: key ? await presignObject(key) : null };
  }));
}

/** The render request, checked enough to be rendered later as is. */
const renderBodyOf = (raw: unknown): RenderBody => {
  const body = raw as Partial<RenderBody> | null;
  if (!body || typeof body !== 'object' || !body.templateId || !body.currentAssets?.backgroundKey || !body.captionText?.trim()) {
    throw new HttpError(400, 'invalid_render', 'This video is not ready to schedule. Tap Edit and check every shot.');
  }
  if (JSON.stringify(body).length > MAX_BODY_BYTES) throw new HttpError(400, 'too_large', 'This video is too large to schedule.');
  const keys = [body.currentAssets.backgroundKey, ...(body.slides ?? []).map((s) => (typeof s === 'string' ? undefined : s.backgroundKey))];
  if (keys.some((k) => k?.startsWith('local:'))) throw new HttpError(400, 'uploading', 'Wait for uploads to finish.');
  return body as RenderBody;
};

const scheduledAtOf = (iso: string): Date => {
  const at = new Date(iso);
  const ahead = at.getTime() - Date.now();
  if (Number.isNaN(ahead)) throw new HttpError(400, 'invalid_date', 'Pick a date.');
  if (ahead < MIN_AHEAD_MS) throw new HttpError(400, 'too_soon', 'Pick a time at least 10 minutes from now.');
  if (ahead > MAX_AHEAD_MS) throw new HttpError(400, 'too_far', 'Pick a date within the next 4 months.');
  return at;
};

const checkTikTok = (t: ScheduleBlitzRequest['tiktok'] | undefined) => {
  if (!t?.privacyLevel) throw new HttpError(400, 'no_privacy', 'Pick who can see this post.');
  if (!t.consent) throw new HttpError(400, 'no_consent', "Accept TikTok's Music Usage Confirmation first.");
  if (t.brandContent && t.privacyLevel === 'SELF_ONLY') throw new HttpError(400, 'branded_private', 'Branded content cannot be private.');
  return t;
};

/**
 * Puts a kept card on the calendar. Needs a TikTok account and one credit in the wallet now (it is charged when the
 * video renders). A card already scheduled moves to the new time and choices.
 */
export async function scheduleBlitz(workspaceId: string, userId: string, req: ScheduleBlitzRequest): Promise<BlitzScheduleDto> {
  const scheduledAt = scheduledAtOf(req.scheduledAt);
  const renderBody = renderBodyOf(req.renderBody);
  const tiktok = checkTikTok(req.tiktok);
  if (!req.cardId) throw new HttpError(400, 'no_card', 'Missing card.');
  await connectionFor(workspaceId, 'tiktok');
  await requireCredits(userId, 1);
  const data = {
    userId,
    variantId: req.variantId ?? null,
    title: (req.title || renderBody.captionText).trim().slice(0, 300),
    coverKey: typeof renderBody.slides?.[0] === 'object' ? (renderBody.slides[0].backgroundKey ?? null) : renderBody.currentAssets.backgroundKey,
    renderBody: renderBody as unknown as Prisma.InputJsonValue,
    scheduledAt,
    privacyLevel: tiktok.privacyLevel,
    allowComments: tiktok.allowComments,
    brandOrganic: tiktok.brandOrganic,
    brandContent: tiktok.brandContent,
    consentAt: new Date(),
  };
  const existing = await prisma.blitzScheduledPost.findFirst({ where: { workspaceId, cardId: req.cardId, status: { in: BLITZ_LIVE } } });
  if (existing && existing.status !== 'scheduled') throw new HttpError(409, 'started', 'This video is already being made or posted.');
  const row = existing
    ? await prisma.blitzScheduledPost.update({ where: { id: existing.id }, data })
    : await prisma.blitzScheduledPost.create({ data: { ...data, workspaceId, cardId: req.cardId } });
  return toScheduleDto(row);
}

/** Takes a video off the calendar. Only before it starts rendering. */
export async function cancelBlitz(workspaceId: string, id: string): Promise<void> {
  const done = await prisma.blitzScheduledPost.updateMany({ where: { id, workspaceId, status: 'scheduled' }, data: { status: 'canceled' } });
  if (done.count === 0) {
    const row = await prisma.blitzScheduledPost.findFirst({ where: { id, workspaceId }, select: { status: true } });
    if (!row) throw new HttpError(404, 'not_found', 'Post not found.');
    if (!BLITZ_LIVE.includes(row.status as BlitzScheduleStatus) || row.status === 'scheduled') return;
    throw new HttpError(409, 'started', 'This video is already being made. It can no longer be canceled.');
  }
}
