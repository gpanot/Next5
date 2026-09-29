// server-only — never import from a 'use client' file.
// Phase 4: approval-first TikTok posting. A person picks the workspace, privacy (from the creator's own options) and
// consents; each approved slideshow gets a time. The cron sends posts when due and polls TikTok until they are live.
// Limits: TikTok allows 6 requests a minute per token, and caps posts a day per creator.

import type { AutoSlideshowPost } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { AutoSlide, AutoPostDto, AutoPostStatus, TikTokWorkspaceDto } from '../../types/admin/autoSlideshow';
import { HttpError } from '../http';
import { clip } from '../metaAds/text';
import { freshAccessToken } from '../social/connections';
import { slideMediaUrl } from '../social/links';
import { tiktok } from '../social/tiktok';
import { fetchPublishStatus, initCarousel, queryCreatorInfo, type CreatorInfo } from '../social/tiktokCarousel';

/** Our own ceiling per creator per 24 h, under TikTok's third-party cap. */
export const MAX_POSTS_PER_DAY = 10;
/** Posts sent per creator per cron tick: 2 × (creator info + init) = 4 requests, under 6 a minute. */
const SENDS_PER_CREATOR_PER_TICK = 2;
const POLLS_PER_TICK = 10;
const MAX_ATTEMPTS = 3;
/** A post still "sending" after this long crashed mid-send: it is retried. */
const STALE_SENDING_MS = 10 * 60 * 1000;

const connectionFor = async (workspaceId: string) => {
  const conn = await prisma.socialConnection.findUnique({ where: { workspaceId_provider: { workspaceId, provider: 'tiktok' } } });
  if (!conn) throw new HttpError(409, 'not_connected', 'This workspace has no TikTok account connected. Connect it in the app: Settings → Integrations.');
  return conn;
};

/** Workspaces with a TikTok account connected, for the run's picker. */
export const listTikTokWorkspaces = async (): Promise<TikTokWorkspaceDto[]> => {
  const rows = await prisma.socialConnection.findMany({ where: { provider: 'tiktok' }, include: { workspace: { select: { name: true } } }, orderBy: { updatedAt: 'desc' } });
  return rows.map((c) => ({ workspaceId: c.workspaceId, workspaceName: c.workspace.name, username: c.username, avatarUrl: c.avatarUrl }));
};

export const setRunWorkspace = async (runId: string, workspaceId: string | null): Promise<void> => {
  if (workspaceId) await connectionFor(workspaceId);
  await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { workspaceId } });
};

/** Live creator info (TikTok requires it before every post, and the approver must see it). */
export const creatorInfoFor = async (workspaceId: string): Promise<CreatorInfo> => {
  if (!tiktok.configured()) throw new HttpError(503, 'tiktok_not_configured', 'TikTok is not set up on this server: add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.');
  return queryCreatorInfo(await freshAccessToken(await connectionFor(workspaceId)));
};

export const toPostDto = (p: AutoSlideshowPost): AutoPostDto => ({
  id: p.id,
  slideshowId: p.slideshowId,
  status: p.status as AutoPostStatus,
  scheduledAt: p.scheduledAt.toISOString(),
  privacyLevel: p.privacyLevel,
  postUrl: p.postUrl,
  error: p.error,
  attempts: p.attempts,
  postedAt: p.postedAt?.toISOString() ?? null,
});

export const listPosts = async (runId: string): Promise<AutoPostDto[]> =>
  (await prisma.autoSlideshowPost.findMany({ where: { runId }, orderBy: { scheduledAt: 'asc' } })).map(toPostDto);

export type ScheduleInput = {
  items: Array<{ slideshowId: string; scheduledAt: string }>;
  privacyLevel: string;
  allowComments: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
  consent: boolean;
};

/** Approves and schedules slideshows on the run's workspace. Re-scheduling a failed or canceled post replaces it. */
export const schedulePosts = async (runId: string, input: ScheduleInput): Promise<AutoPostDto[]> => {
  const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: runId }, select: { workspaceId: true } });
  if (!run.workspaceId) throw new HttpError(409, 'no_workspace', 'Pick the workspace whose TikTok account will post.');
  if (input.consent !== true) throw new HttpError(400, 'no_consent', 'Accept TikTok\'s Music Usage Confirmation first.');
  const creator = await creatorInfoFor(run.workspaceId);
  if (!creator.privacyOptions.includes(input.privacyLevel)) throw new HttpError(400, 'bad_privacy', `Pick who can see the post: ${creator.privacyOptions.join(', ')}.`);
  if (input.brandContent && input.privacyLevel === 'SELF_ONLY') throw new HttpError(400, 'branded_private', 'Branded content cannot be private.');
  const shows = await prisma.autoSlideshow.findMany({ where: { runId, id: { in: input.items.map((i) => i.slideshowId) } }, include: { post: true } });
  const now = new Date();
  for (const item of input.items) {
    const show = shows.find((s) => s.id === item.slideshowId);
    const at = new Date(item.scheduledAt);
    if (!show || show.status !== 'ready') throw new HttpError(400, 'not_ready', 'Only ready slideshows can be scheduled.');
    if (Number.isNaN(at.getTime())) throw new HttpError(400, 'bad_time', 'Every post needs a time.');
    if (show.post && !['failed', 'canceled'].includes(show.post.status)) throw new HttpError(409, 'already_scheduled', `"${show.topic}" is already scheduled or posted.`);
    const data = {
      runId, workspaceId: run.workspaceId, status: 'scheduled', scheduledAt: at < now ? now : at, privacyLevel: input.privacyLevel,
      allowComments: input.allowComments && !creator.commentDisabled, brandOrganic: input.brandOrganic, brandContent: input.brandContent,
      consentAt: now, publishId: null, tiktokPostId: null, postUrl: null, attempts: 0, error: null, sentAt: null, postedAt: null,
    };
    await prisma.autoSlideshowPost.upsert({ where: { slideshowId: show.id }, create: { slideshowId: show.id, ...data }, update: data });
  }
  return listPosts(runId);
};

const loadPost = async (runId: string, postId: string) => {
  const post = await prisma.autoSlideshowPost.findFirst({ where: { id: postId, runId } });
  if (!post) throw new HttpError(404, 'post_not_found', 'Post not found.');
  return post;
};

export const cancelPost = async (runId: string, postId: string): Promise<void> => {
  const post = await loadPost(runId, postId);
  if (post.status !== 'scheduled' && post.status !== 'failed') throw new HttpError(409, 'not_cancelable', 'Only scheduled or failed posts can be canceled.');
  await prisma.autoSlideshowPost.update({ where: { id: postId }, data: { status: 'canceled' } });
};

export type PostNowInput = Omit<ScheduleInput, 'items'> & { workspaceId: string };

/** The editor's "Post to TikTok": uses the chosen account for the run, approves this slideshow for now, sends it. */
export const postSlideshowNow = async (runId: string, slideshowId: string, input: PostNowInput): Promise<AutoPostDto> => {
  const existing = await prisma.autoSlideshowPost.findUnique({ where: { slideshowId } });
  if (existing && ['sending', 'processing', 'posted'].includes(existing.status)) throw new HttpError(409, 'already_posted', 'This slideshow is already posted or on its way.');
  await setRunWorkspace(runId, input.workspaceId);
  const { privacyLevel, allowComments, brandOrganic, brandContent, consent } = input;
  // A scheduled post is replaced by this one (same slideshow, sent now with the settings just chosen).
  if (existing?.status === 'scheduled') await prisma.autoSlideshowPost.update({ where: { id: existing.id }, data: { status: 'canceled' } });
  await schedulePosts(runId, { privacyLevel, allowComments, brandOrganic, brandContent, consent, items: [{ slideshowId, scheduledAt: new Date().toISOString() }] });
  const post = await prisma.autoSlideshowPost.findUniqueOrThrow({ where: { slideshowId } });
  await sendPost(post.id);
  return toPostDto(await prisma.autoSlideshowPost.findUniqueOrThrow({ where: { id: post.id } }));
};

/** Moves a scheduled or failed post to now; the next cron tick (or "Send now") sends it. */
export const postNow = async (runId: string, postId: string): Promise<void> => {
  const post = await loadPost(runId, postId);
  if (!['scheduled', 'failed'].includes(post.status)) throw new HttpError(409, 'not_sendable', 'This post is already sent.');
  await prisma.autoSlideshowPost.update({ where: { id: postId }, data: { status: 'scheduled', scheduledAt: new Date(), error: null, attempts: post.status === 'failed' ? 0 : post.attempts } });
  await sendPost(postId);
};

/** Plain advice for TikTok error codes a person can fix; other errors pass through as TikTok wrote them. */
const TIKTOK_FIXES: Record<string, string> = {
  unaudited_client_can_only_post_to_private_accounts:
    'Until TikTok audits the app, the TikTok account itself must be private: in the TikTok app, Settings and privacy → Privacy → turn on Private account. Then retry.',
  spam_risk_too_many_posts: 'TikTok\'s daily posting limit for this account is reached. Retry tomorrow.',
  url_ownership_unverified: 'TikTok cannot pull the photos: verify the app\'s domain in the TikTok developer portal (Content Posting API → Verify domains).',
  privacy_level_option_mismatch: 'This privacy is no longer allowed on the account. Schedule it again with another privacy.',
};

const explain = (message: string): string => {
  const code = Object.keys(TIKTOK_FIXES).find((c) => message.includes(c));
  return code ? `${TIKTOK_FIXES[code]} (${code})` : message;
};

const captionOf = (caption: string, hashtags: string[]) => [caption.trim(), hashtags.map((h) => `#${h}`).join(' ')].filter(Boolean).join('\n\n');

/** Claims one due post (so two ticks never send it twice), then creator info → init. Never throws. */
export const sendPost = async (postId: string): Promise<void> => {
  const claimed = await prisma.autoSlideshowPost.updateMany({ where: { id: postId, status: 'scheduled' }, data: { status: 'sending', sentAt: new Date(), attempts: { increment: 1 } } });
  if (claimed.count === 0) return;
  const post = await prisma.autoSlideshowPost.findUniqueOrThrow({ where: { id: postId }, include: { slideshow: true } });
  try {
    const conn = await connectionFor(post.workspaceId);
    const token = await freshAccessToken(conn);
    const creator = await queryCreatorInfo(token);
    if (!creator.privacyOptions.includes(post.privacyLevel)) throw new Error(`The account no longer allows "${post.privacyLevel}". Schedule it again with another privacy.`);
    const slides = post.slideshow.slides as unknown as AutoSlide[];
    const publishId = await initCarousel(token, {
      photoUrls: slides.map((_, i) => slideMediaUrl(post.slideshowId, i)),
      title: slides[0]?.title ?? post.slideshow.topic,
      description: captionOf(post.slideshow.caption, post.slideshow.hashtags),
      privacyLevel: post.privacyLevel,
      allowComments: post.allowComments && !creator.commentDisabled,
      brandOrganic: post.brandOrganic,
      brandContent: post.brandContent,
    });
    await prisma.autoSlideshowPost.update({ where: { id: postId }, data: { status: 'processing', publishId, error: null } });
  } catch (err) {
    const message = clip(explain(err instanceof Error ? err.message : String(err)), 500);
    // Rate limits and TikTok hiccups get another try on a later tick; anything else fails for a person to look at.
    const retry = post.attempts < MAX_ATTEMPTS && /rate|limit|timeout|temporar|internal|502|503/i.test(message);
    await prisma.autoSlideshowPost.update({ where: { id: postId }, data: { status: retry ? 'scheduled' : 'failed', error: message, ...(retry ? { scheduledAt: new Date(Date.now() + 5 * 60 * 1000) } : {}) } });
  }
};

/** Asks TikTok how a sent post is doing. Never throws. */
export const refreshPost = async (postId: string): Promise<void> => {
  const post = await prisma.autoSlideshowPost.findUnique({ where: { id: postId } });
  if (!post?.publishId || post.status !== 'processing') return;
  try {
    const conn = await connectionFor(post.workspaceId);
    const state = await fetchPublishStatus(await freshAccessToken(conn), post.publishId);
    if (state.state === 'posted') {
      // Private posts get no public id: link the profile instead, where the owner sees the post.
      const profile = conn.username ? `https://www.tiktok.com/@${conn.username}` : null;
      const postUrl = state.postId && profile ? `${profile}/photo/${state.postId}` : profile;
      await prisma.autoSlideshowPost.update({ where: { id: postId }, data: { status: 'posted', tiktokPostId: state.postId, postUrl, postedAt: new Date(), error: null } });
    } else if (state.state === 'failed') {
      await prisma.autoSlideshowPost.update({ where: { id: postId }, data: { status: 'failed', error: clip(`TikTok: ${state.reason}`, 500) } });
    }
  } catch (err) {
    console.warn(`[auto-slideshow] status of post ${postId} unknown:`, err instanceof Error ? err.message : err);
  }
};

/** Posts already sent through this workspace in the last 24 hours. */
const sentToday = (workspaceId: string) =>
  prisma.autoSlideshowPost.count({ where: { workspaceId, sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, status: { in: ['sending', 'processing', 'posted'] } } });

/** One cron tick: recover stuck sends, send due posts within the limits, then poll sent ones. */
export const runPostingTick = async (): Promise<{ sent: number; polled: number; deferred: number }> => {
  await prisma.autoSlideshowPost.updateMany({ where: { status: 'sending', sentAt: { lt: new Date(Date.now() - STALE_SENDING_MS) } }, data: { status: 'scheduled' } });
  const due = await prisma.autoSlideshowPost.findMany({ where: { status: 'scheduled', scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: 'asc' }, take: 50 });
  const perWorkspace = new Map<string, number>();
  let sent = 0;
  let deferred = 0;
  for (const post of due) {
    const inTick = perWorkspace.get(post.workspaceId) ?? 0;
    if (inTick >= SENDS_PER_CREATOR_PER_TICK || (await sentToday(post.workspaceId)) >= MAX_POSTS_PER_DAY) {
      deferred += 1;
      continue;
    }
    perWorkspace.set(post.workspaceId, inTick + 1);
    await sendPost(post.id);
    sent += 1;
  }
  const processing = await prisma.autoSlideshowPost.findMany({ where: { status: 'processing' }, orderBy: { sentAt: 'asc' }, take: POLLS_PER_TICK, select: { id: true } });
  for (const p of processing) await refreshPost(p.id);
  return { sent, polled: processing.length, deferred };
};
