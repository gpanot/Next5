// server-only — never import from a 'use client' file.
// Kept Blitz videos on the calendar: schedule (planned), approve, list, cancel. Scheduling charges 1 credit and saves the render request; the tick
// (blitzScheduleTick.ts) renders and posts it near its time.

import type { BlitzScheduledPost, Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { BLITZ_LIVE, MAX_POSTS_PER_DAY, type BlitzAccountsDto, type BlitzEditDto, type BlitzPlatform, type BlitzScheduleDto, type PostNowBlitzRequest, type BlitzScheduleStatus, type ApproveBlitzRequest, type CalendarBusyDto, type MoveBlitzRequest, type ScheduleBlitzRequest } from '../../types/admin/blitzSchedule';
import { blitzBrowserUrl } from '../admin/blitzStore';
import { connectionFor } from '../autoSlideshow/posting';
import { isYouTubePrivacy } from '../social/youtubeUpload';
import { listConnections } from '../social/connections';
import { tiktok } from '../social/tiktok';
import { youtube } from '../social/youtube';
import { HttpError } from '../http';
import { presignObject } from '../storage/objectStore';
import { refundBlitzCharge } from '../slideshowCredits/blitzCharge';
import { maybeAutoRecharge } from '../slideshowCredits/autoRecharge';
import { requireCredits } from '../slideshowCredits/charge';
import { SLIDESHOW_PRICE_CENTS } from '../../types/admin/slideshowCredits';
import { applyEntry } from '../slideshowCredits/wallet';
import type { RenderBody } from './blitzRender';

/** A post must be at least this far ahead, so the render has time to start. */
const MIN_AHEAD_MS = 10 * 60 * 1000;
/** Most a post can be scheduled ahead. */
const MAX_AHEAD_MS = 120 * 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 250_000;
const IMAGE_KEY = /\.(jpe?g|png|webp)$/i;
const VIDEO_KEY = /\.(mp4|mov|webm|m4v)$/i;

export const toScheduleDto = async (p: BlitzScheduledPost): Promise<BlitzScheduleDto> => ({
  id: p.id,
  cardId: p.cardId,
  title: p.title,
  coverUrl: p.coverKey && (IMAGE_KEY.test(p.coverKey) || VIDEO_KEY.test(p.coverKey)) ? await blitzBrowserUrl(p.coverKey) : null,
  coverIsVideo: Boolean(p.coverKey && VIDEO_KEY.test(p.coverKey)),
  scheduledAt: p.scheduledAt.toISOString(),
  status: p.status as BlitzScheduleStatus,
  postUrl: p.postUrl,
  error: p.error,
  platform: p.platform === 'youtube' ? 'youtube' : 'tiktok',
  projectId: p.projectId,
  postedAt: p.postedAt?.toISOString() ?? null,
});

/** A key as a browser URL with its kind, or null for anything that is not a photo or a clip. */
const mediaOf = async (key: string | undefined) =>
  key && (IMAGE_KEY.test(key) || VIDEO_KEY.test(key)) ? { url: await blitzBrowserUrl(key), video: VIDEO_KEY.test(key) } : null;

/** One calendar video as saved: its preview (each shot's media, the music) and what re-opens it in the Blitz editor. */
export async function getBlitzEdit(workspaceId: string, id: string): Promise<BlitzEditDto> {
  const post = await prisma.blitzScheduledPost.findFirst({ where: { id, workspaceId } });
  if (!post) throw new HttpError(404, 'not_found', 'This video is not on the calendar.');
  const body = post.renderBody as unknown as RenderBody;
  const slides = (body.slides ?? []).map((s) => (typeof s === 'string' ? { text: s } : s));
  const audioKey = body.currentAssets?.audioKey;
  return {
    item: await toScheduleDto(post),
    assets: { slides, audioKey, textConfigOverride: body.textConfigOverride, businessText: body.mentionBusiness ? body.businessText : undefined, muteVideoAudio: body.muteVideoAudio, set: body.set },
    media: await Promise.all(slides.map((s) => mediaOf(s.backgroundKey))),
    audioUrl: audioKey ? await blitzBrowserUrl(audioKey) : null,
  };
}

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

const checkTikTok = (t: ApproveBlitzRequest['tiktok'] | undefined) => {
  if (!t?.privacyLevel) throw new HttpError(400, 'no_privacy', 'Pick who can see this post.');
  if (!t.consent) throw new HttpError(400, 'no_consent', "Accept TikTok's Music Usage Confirmation first.");
  if (t.brandContent && t.privacyLevel === 'SELF_ONLY') throw new HttpError(400, 'branded_private', 'Branded content cannot be private.');
  return t;
};

/** The viewer's day around `at`, from their `getTimezoneOffset()` (UTC when missing). */
const dayAround = (at: Date, tzOffsetMin: unknown) => {
  const offsetMs = (typeof tzOffsetMin === 'number' && Math.abs(tzOffsetMin) <= 14 * 60 ? tzOffsetMin : 0) * 60_000;
  const start = new Date(Math.floor((at.getTime() - offsetMs) / 86_400_000) * 86_400_000 + offsetMs);
  return { gte: start, lt: new Date(start.getTime() + 86_400_000) };
};

/** Refuses a 6th post on one day: Blitz and Auto Slideshow posts together, `except` the post being moved. */
const checkDayRoom = async (workspaceId: string, at: Date, tzOffsetMin: unknown, except?: string) => {
  const day = dayAround(at, tzOffsetMin);
  const [blitz, slideshows] = await Promise.all([
    prisma.blitzScheduledPost.count({ where: { workspaceId, status: { in: BLITZ_LIVE }, scheduledAt: day, ...(except ? { id: { not: except } } : {}) } }),
    prisma.autoSlideshowPost.count({ where: { workspaceId, status: { in: ['scheduled', 'sending', 'processing', 'posted'] }, scheduledAt: day } }),
  ]);
  if (blitz + slideshows >= MAX_POSTS_PER_DAY) throw new HttpError(409, 'day_full', `That day already has ${MAX_POSTS_PER_DAY} posts. Pick another day.`);
};

/** A new post and its 1 credit, in one transaction: a short balance (402) schedules nothing. */
const createPaidPost = async (userId: string, data: Prisma.BlitzScheduledPostUncheckedCreateInput) => {
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.blitzScheduledPost.create({ data });
    await applyEntry(tx, { userId, deltaCents: -SLIDESHOW_PRICE_CENTS, reason: 'slideshow_charge', ref: created.id, note: 'Scheduled Blitz video' }, true);
    return created;
  });
  await maybeAutoRecharge(userId).catch((err: unknown) => console.error('[blitz-schedule] auto recharge failed:', err));
  return row;
};

/** Not started yet: still on the calendar, waiting for approval or for its render. */
const MOVABLE = ['planned', 'scheduled'];

/**
 * Puts a kept card on the calendar as `planned` and charges 1 credit now (refunded when canceled, when it is not
 * approved in time, or when the video cannot be made). It is approved on the calendar, like the slideshows. A card
 * already on the calendar moves to the new day, free, and keeps its approval.
 */
export async function scheduleBlitz(workspaceId: string, userId: string, req: ScheduleBlitzRequest): Promise<BlitzScheduleDto> {
  const scheduledAt = scheduledAtOf(req.scheduledAt);
  const renderBody = renderBodyOf(req.renderBody);
  if (!req.cardId) throw new HttpError(400, 'no_card', 'Missing card.');
  const data = {
    userId,
    variantId: req.variantId ?? null,
    title: (req.title || renderBody.captionText).trim().slice(0, 300),
    coverKey: typeof renderBody.slides?.[0] === 'object' ? (renderBody.slides[0].backgroundKey ?? null) : renderBody.currentAssets.backgroundKey,
    renderBody: renderBody as unknown as Prisma.InputJsonValue,
    scheduledAt,
  };
  const existing = await prisma.blitzScheduledPost.findFirst({ where: { workspaceId, cardId: req.cardId, status: { in: BLITZ_LIVE } } });
  if (existing && !MOVABLE.includes(existing.status)) throw new HttpError(409, 'started', 'This video is already being made or posted.');
  await checkDayRoom(workspaceId, scheduledAt, req.tzOffsetMin, existing?.id);
  if (!existing) await requireCredits(userId, 1);
  const row = existing
    ? await prisma.blitzScheduledPost.update({ where: { id: existing.id }, data })
    : await createPaidPost(userId, { ...data, workspaceId, cardId: req.cardId, status: 'planned' });
  // A calendar idea made into a post leaves the ideas list.
  if (req.variantId) await prisma.slideshowVariant.updateMany({ where: { id: req.variantId, workspaceId, plannedAt: { not: null } }, data: { status: 'made' } });
  return toScheduleDto(row);
}

/** What an approval stores: the platform and its checked choices. */
const approvalOf = (req: ApproveBlitzRequest) => {
  if (req.platform === 'youtube') {
    const privacy = req.youtube?.privacyLevel ?? 'private';
    if (!isYouTubePrivacy(privacy)) throw new HttpError(400, 'bad_privacy', 'Pick who can see the Short: private, unlisted or public.');
    return { platform: 'youtube' as const, privacyLevel: privacy, allowComments: true, brandOrganic: false, brandContent: false };
  }
  const t = checkTikTok(req.tiktok);
  return { platform: 'tiktok' as const, privacyLevel: t.privacyLevel, allowComments: t.allowComments, brandOrganic: t.brandOrganic, brandContent: t.brandContent };
};

/** The approval on the calendar: the platform's choices and consent. Needs that account connected. Can be redone. */
export async function approveBlitz(workspaceId: string, id: string, req: ApproveBlitzRequest): Promise<BlitzScheduleDto> {
  const approval = approvalOf(req);
  await connectionFor(workspaceId, approval.platform);
  const done = await prisma.blitzScheduledPost.updateMany({
    where: { id, workspaceId, status: { in: MOVABLE } },
    data: { status: 'scheduled', ...approval, consentAt: new Date(), error: null },
  });
  if (done.count === 0) throw new HttpError(409, 'started', 'This video is already being made or posted.');
  return toScheduleDto(await prisma.blitzScheduledPost.findUniqueOrThrow({ where: { id } }));
}

/** The workspace's finished render that "Post now" uploads as is, or a 400 saying why it cannot. */
const readyVideoOf = async (workspaceId: string, projectId: string): Promise<string> => {
  const project = await prisma.blitzProject.findFirst({ where: { id: projectId, workspaceId }, select: { renderStatus: true, renderedVideoKey: true } });
  if (!project) throw new HttpError(400, 'no_video', 'This video was not found. Tap Generate again.');
  if (project.renderStatus !== 'COMPLETED' || !project.renderedVideoKey) throw new HttpError(400, 'not_rendered', 'The video is not ready yet. Wait for Download, then post it.');
  return projectId;
};

/**
 * "Post now" from the kept list, approved at once and due now. With a `projectId` (made with Generate, already paid)
 * the tick uploads that video right away, free. Without one it costs 1 credit and the tick renders it first (about
 * 5 minutes). A card already on the calendar (not started) is replaced by this post; its credit is kept, or refunded
 * when the post uses a video already made.
 */
export async function postBlitzNow(workspaceId: string, userId: string, req: PostNowBlitzRequest): Promise<BlitzScheduleDto> {
  const approval = approvalOf(req);
  await connectionFor(workspaceId, approval.platform);
  const renderBody = renderBodyOf(req.renderBody);
  if (!req.cardId) throw new HttpError(400, 'no_card', 'Missing card.');
  const projectId = req.projectId ? await readyVideoOf(workspaceId, req.projectId) : null;
  const scheduledAt = new Date();
  const data = {
    userId,
    variantId: req.variantId ?? null,
    title: (req.title || renderBody.captionText).trim().slice(0, 300),
    coverKey: typeof renderBody.slides?.[0] === 'object' ? (renderBody.slides[0].backgroundKey ?? null) : renderBody.currentAssets.backgroundKey,
    renderBody: renderBody as unknown as Prisma.InputJsonValue,
    scheduledAt,
    // A video already made skips the render: the tick sees it finished and uploads it.
    status: projectId ? 'rendering' : 'scheduled',
    projectId,
    ...approval,
    consentAt: scheduledAt,
    error: null,
  };
  const existing = await prisma.blitzScheduledPost.findFirst({ where: { workspaceId, cardId: req.cardId, status: { in: BLITZ_LIVE } } });
  if (existing && !MOVABLE.includes(existing.status)) throw new HttpError(409, 'started', 'This video is already being made or posted.');
  await checkDayRoom(workspaceId, scheduledAt, req.tzOffsetMin, existing?.id);
  if (!existing && !projectId) await requireCredits(userId, 1);
  const row = existing
    ? await prisma.blitzScheduledPost.update({ where: { id: existing.id }, data })
    : projectId
      ? await prisma.blitzScheduledPost.create({ data: { ...data, workspaceId, cardId: req.cardId } })
      : await createPaidPost(userId, { ...data, workspaceId, cardId: req.cardId });
  if (existing && projectId) await refundBlitzCharge(existing.id, 'Posted a video already made');
  if (req.variantId) await prisma.slideshowVariant.updateMany({ where: { id: req.variantId, workspaceId, plannedAt: { not: null } }, data: { status: 'made' } });
  return toScheduleDto(row);
}

/** The connected platforms a Blitz video can post to, for the approve and post-now sheets. */
export async function blitzAccounts(workspaceId: string): Promise<BlitzAccountsDto> {
  const accounts: BlitzAccountsDto['accounts'] = {};
  for (const c of await listConnections(workspaceId)) if (c.provider === 'tiktok' || c.provider === 'youtube') accounts[c.provider as BlitzPlatform] = { username: c.username };
  return { accounts, configured: { tiktok: tiktok.configured(), youtube: youtube.configured() } };
}

/** Moves a video not started yet to another time (dragged to another day). Free; keeps its approval. */
export async function moveBlitz(workspaceId: string, id: string, req: MoveBlitzRequest): Promise<BlitzScheduleDto> {
  const scheduledAt = scheduledAtOf(req.scheduledAt);
  await checkDayRoom(workspaceId, scheduledAt, req.tzOffsetMin, id);
  const done = await prisma.blitzScheduledPost.updateMany({ where: { id, workspaceId, status: { in: MOVABLE } }, data: { scheduledAt } });
  if (done.count === 0) throw new HttpError(409, 'started', 'This video is already being made or posted.');
  return toScheduleDto(await prisma.blitzScheduledPost.findUniqueOrThrow({ where: { id } }));
}

/** Takes a video off the calendar and gives its credit back. Only before it starts rendering. */
export async function cancelBlitz(workspaceId: string, id: string): Promise<void> {
  const done = await prisma.blitzScheduledPost.updateMany({ where: { id, workspaceId, status: { in: MOVABLE } }, data: { status: 'canceled' } });
  if (done.count === 0) {
    const row = await prisma.blitzScheduledPost.findFirst({ where: { id, workspaceId }, select: { status: true } });
    if (!row) throw new HttpError(404, 'not_found', 'Post not found.');
    if (!BLITZ_LIVE.includes(row.status as BlitzScheduleStatus) || MOVABLE.includes(row.status)) return;
    throw new HttpError(409, 'started', 'This video is already being made. It can no longer be canceled.');
  }
  await refundBlitzCharge(id, 'Scheduled Blitz video canceled');
}
