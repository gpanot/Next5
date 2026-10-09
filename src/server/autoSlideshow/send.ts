// server-only — never import from a 'use client' file.
// Sends approved posts when due and follows them until they are live, per platform:
//   TikTok: creator info → init carousel → poll the publish status.
//   YouTube: render the MP4 (Blitz worker) → upload it as a Short → wait until YouTube has processed it.
//   Instagram: item containers → carousel container → publish once Meta has the photos (FINISHED).
// Limits: TikTok allows 6 requests a minute per token and caps posts a day per creator; we stay under both.

import type { AutoSlideshowPost } from '@prisma/client';
import { prisma } from '../../lib/db';
import { PLATFORM_LABELS, type AutoSlide, type PostPlatform } from '../../types/admin/autoSlideshow';
import { HttpError } from '../http';
import { clip } from '../metaAds/text';
import { freshAccessToken } from '../social/connections';
import { containerStatus, createCarousel, instagramCaption, publishContainer } from '../social/instagramCarousel';
import { mediaBaseUrl, mediaIsPublic, slideMediaUrl } from '../social/links';
import { getObject } from '../storage/objectStore';
import { shortState, uploadShort, isYouTubePrivacy } from '../social/youtubeUpload';
import { fetchPublishStatus, initCarousel, queryCreatorInfo } from '../social/tiktokCarousel';
import { runBlitzScheduleTick } from '../labs/blitzScheduleTick';
import { refreshBlitzIdeaStats } from '../labs/blitzStats';
import { refreshDueStats } from './stats';
import { videoForPost } from './video';
import { firstStatsAt } from './statsSchedule';

/** Our own ceiling per account per 24 h, under TikTok's third-party cap and Instagram's 100 API posts. */
export const MAX_POSTS_PER_DAY = 10;
/** Posts sent per account per tick: 2 × (creator info + init) = 4 TikTok requests, under 6 a minute. */
const SENDS_PER_ACCOUNT_PER_TICK = 2;
const POLLS_PER_TICK = 10;
const MAX_ATTEMPTS = 3;
/** A post still "sending" after this long crashed mid-send: it is retried. */
const STALE_SENDING_MS = 10 * 60 * 1000;
/** How long a send waits for Instagram to take the photos before leaving it to the next poll. */
const IG_WAIT_MS = 20_000;

type PostWithShow = AutoSlideshowPost & { slideshow: { slides: unknown; topic: string; caption: string; hashtags: string[] } };

const connection = async (post: AutoSlideshowPost) => {
  const conn = await prisma.socialConnection.findUnique({ where: { workspaceId_provider: { workspaceId: post.workspaceId, provider: post.platform } } });
  if (!conn) throw new HttpError(409, 'not_connected', `This workspace has no ${PLATFORM_LABELS[post.platform as PostPlatform] ?? post.platform} account connected anymore.`);
  return conn;
};

/** Plain advice for platform errors a person can fix; other errors pass through as the platform wrote them. */
const FIXES: Record<string, string> = {
  unaudited_client_can_only_post_to_private_accounts:
    'Until TikTok audits the app, the TikTok account itself must be private: in the TikTok app, Settings and privacy → Privacy → turn on Private account. Then retry.',
  spam_risk_too_many_posts: 'TikTok\'s daily posting limit for this account is reached. Retry tomorrow.',
  url_ownership_unverified: 'TikTok cannot pull the photos: verify the app\'s domain in the TikTok developer portal (Content Posting API → Verify domains).',
  privacy_level_option_mismatch: 'This privacy is no longer allowed on the account. Schedule it again with another privacy.',
  'Only photo or video can be accepted as media type': 'Instagram could not read a slide image. Check MEDIA_PUBLIC_URL points to the live https site.',
  quotaExceeded: 'YouTube\'s daily upload quota of the app is used up. It resets at midnight Pacific time. Retry tomorrow.',
  uploadLimitExceeded: 'This YouTube channel hit its daily upload limit. Retry tomorrow.',
  youtubeSignupRequired: 'The Google account has no YouTube channel. Create one on youtube.com, then connect YouTube again.',
  forbidden: 'YouTube refused the upload. Disconnect and connect YouTube again in Settings → Accounts, and tick every permission box.',
  'Application does not have permission': 'The Instagram connection is missing a permission: disconnect and connect Instagram again in Settings → Accounts.',
};

const explain = (message: string): string => {
  const code = Object.keys(FIXES).find((c) => message.includes(c));
  return code ? `${FIXES[code]} (${code})` : message;
};

const captionOf = (caption: string, hashtags: string[]) => [caption.trim(), hashtags.map((h) => `#${h}`).join(' ')].filter(Boolean).join('\n\n');

const photoUrls = (post: PostWithShow) => (post.slideshow.slides as AutoSlide[]).map((_, i) => slideMediaUrl(post.slideshowId, i));

const sendTikTok = async (post: PostWithShow): Promise<void> => {
  const token = await freshAccessToken(await connection(post));
  const creator = await queryCreatorInfo(token);
  if (!creator.privacyOptions.includes(post.privacyLevel)) throw new Error(`The account no longer allows "${post.privacyLevel}". Schedule it again with another privacy.`);
  const slides = post.slideshow.slides as AutoSlide[];
  const publishId = await initCarousel(token, {
    photoUrls: photoUrls(post),
    title: slides[0]?.title ?? post.slideshow.topic,
    description: captionOf(post.slideshow.caption, post.slideshow.hashtags),
    privacyLevel: post.privacyLevel,
    allowComments: post.allowComments && !creator.commentDisabled,
    brandOrganic: post.brandOrganic,
    brandContent: post.brandContent,
  });
  // The creator's handle (the connection only stores the display name) links the post once it is live.
  const profile = creator.username ? `https://www.tiktok.com/@${creator.username}` : null;
  await prisma.autoSlideshowPost.update({ where: { id: post.id }, data: { status: 'processing', publishId, postUrl: profile, error: null } });
};

/** Publishes the carousel container once Meta has the photos; until then the post waits in "processing". */
const finishInstagram = async (post: AutoSlideshowPost, token: string, igUserId: string, containerId: string, waitMs: number): Promise<void> => {
  const deadline = Date.now() + waitMs;
  for (;;) {
    const { state, detail } = await containerStatus(token, containerId);
    if (state === 'FINISHED') break;
    if (state === 'ERROR' || state === 'EXPIRED') throw new Error(`Instagram could not prepare the post (${state}${detail ? `: ${detail}` : ''}).`);
    if (Date.now() > deadline) return;
    await new Promise((r) => setTimeout(r, 3_000));
  }
  const { mediaId, permalink } = await publishContainer(token, igUserId, containerId);
  const postedAt = new Date();
  await prisma.autoSlideshowPost.update({ where: { id: post.id }, data: { status: 'posted', tiktokPostId: mediaId, postUrl: permalink, postedAt, nextStatsAt: firstStatsAt(postedAt), error: null } });
};

const sendInstagram = async (post: PostWithShow): Promise<void> => {
  const conn = await connection(post);
  const token = await freshAccessToken(conn);
  const containerId = await createCarousel(token, conn.externalId, photoUrls(post), instagramCaption(post.slideshow.caption, post.slideshow.hashtags));
  await prisma.autoSlideshowPost.update({ where: { id: post.id }, data: { status: 'processing', publishId: containerId, error: null } });
  await finishInstagram(post, token, conn.externalId, containerId, IG_WAIT_MS);
};

/** Marker in publish_id while a YouTube post waits for its MP4 to render; after the upload it holds the video id. */
const RENDERING = 'render';

/** YouTube takes an MP4, not photos: render the slideshow (about 90 s), then upload it. Called on send and on every poll. */
const deliverYouTube = async (post: AutoSlideshowPost): Promise<void> => {
  const conn = await connection(post);
  const video = await videoForPost(post.slideshowId, post.workspaceId);
  if (!video.key) {
    await prisma.autoSlideshowPost.update({ where: { id: post.id }, data: { status: 'processing', publishId: RENDERING, error: null } });
    return;
  }
  const mp4 = await getObject(video.key);
  if (!mp4) throw new Error('The rendered video file is missing. Download the video once to render it again.');
  const show = await prisma.autoSlideshow.findUniqueOrThrow({ where: { id: post.slideshowId }, select: { topic: true, caption: true, hashtags: true, slides: true } });
  const privacy = isYouTubePrivacy(post.privacyLevel) ? post.privacyLevel : 'private';
  const videoId = await uploadShort(await freshAccessToken(conn), {
    title: (show.slides as AutoSlide[])[0]?.title ?? show.topic,
    description: captionOf(show.caption, show.hashtags),
    tags: show.hashtags.map((h) => h.replace(/^#/, '')),
    privacy,
    video: mp4,
  });
  await prisma.autoSlideshowPost.update({ where: { id: post.id }, data: { status: 'processing', publishId: videoId, tiktokPostId: videoId, postUrl: `https://www.youtube.com/shorts/${videoId}`, error: null } });
};

/** Waits for YouTube to finish checking an uploaded video; posted once it is processed. */
const refreshYouTube = async (post: AutoSlideshowPost): Promise<void> => {
  if (post.publishId === RENDERING) return deliverYouTube(post);
  const state = await shortState(await freshAccessToken(await connection(post)), post.publishId!);
  if (state.state === 'posted') {
    const postedAt = new Date();
    // Stats for YouTube are not read yet: no schedule.
    await prisma.autoSlideshowPost.update({ where: { id: post.id }, data: { status: 'posted', postedAt, nextStatsAt: null, error: null } });
  } else if (state.state === 'failed') {
    await prisma.autoSlideshowPost.update({ where: { id: post.id }, data: { status: 'failed', error: clip(`YouTube: ${state.reason}`, 500) } });
  }
};

/** Claims one due post (so two ticks never send it twice), then sends it on its platform. Never throws. */
export const sendPost = async (postId: string): Promise<void> => {
  const claimed = await prisma.autoSlideshowPost.updateMany({ where: { id: postId, status: 'scheduled' }, data: { status: 'sending', sentAt: new Date(), attempts: { increment: 1 } } });
  if (claimed.count === 0) return;
  const post = await prisma.autoSlideshowPost.findUniqueOrThrow({ where: { id: postId }, include: { slideshow: true } });
  try {
    if (post.platform !== 'youtube' && !mediaIsPublic()) throw new Error(`The platforms cannot download photos from ${mediaBaseUrl()}. Post from the live site, or set MEDIA_PUBLIC_URL=https://next5.giinger.com on this server.`);
    await (post.platform === 'youtube' ? deliverYouTube(post) : post.platform === 'instagram' ? sendInstagram(post) : sendTikTok(post));
  } catch (err) {
    const message = clip(explain(err instanceof Error ? err.message : String(err)), 500);
    // Rate limits and platform hiccups get another try on a later tick; anything else fails for a person to look at.
    const retry = post.attempts < MAX_ATTEMPTS && /rate|limit|timeout|temporar|internal|502|503/i.test(message);
    await prisma.autoSlideshowPost.update({ where: { id: postId }, data: { status: retry ? 'scheduled' : 'failed', error: message, ...(retry ? { scheduledAt: new Date(Date.now() + 5 * 60 * 1000) } : {}) } });
  }
};

const refreshTikTok = async (post: AutoSlideshowPost): Promise<void> => {
  const state = await fetchPublishStatus(await freshAccessToken(await connection(post)), post.publishId!);
  if (state.state === 'posted') {
    // Private posts get no public id: link the profile instead (saved at send time), where the owner sees the post.
    const profile = post.postUrl;
    const postUrl = state.postId && profile ? `${profile}/photo/${state.postId}` : profile;
    const postedAt = new Date();
    // Private posts have no public numbers: they are never scheduled for a read.
    const nextStatsAt = state.postId && post.privacyLevel !== 'SELF_ONLY' ? firstStatsAt(postedAt) : null;
    await prisma.autoSlideshowPost.update({ where: { id: post.id }, data: { status: 'posted', tiktokPostId: state.postId, postUrl, postedAt, nextStatsAt, error: null } });
  } else if (state.state === 'failed') {
    await prisma.autoSlideshowPost.update({ where: { id: post.id }, data: { status: 'failed', error: clip(`TikTok: ${state.reason}`, 500) } });
  }
};

/** Asks the platform how a sent post is doing (Instagram: publishes it once ready). Never throws. */
export const refreshPost = async (postId: string): Promise<void> => {
  const post = await prisma.autoSlideshowPost.findUnique({ where: { id: postId } });
  if (!post?.publishId || post.status !== 'processing') return;
  try {
    if (post.platform === 'youtube') {
      await refreshYouTube(post);
    } else if (post.platform === 'instagram') {
      const conn = await connection(post);
      await finishInstagram(post, await freshAccessToken(conn), conn.externalId, post.publishId, 0);
    } else {
      await refreshTikTok(post);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (post.platform === 'instagram' && /could not prepare/.test(message)) {
      await prisma.autoSlideshowPost.update({ where: { id: postId }, data: { status: 'failed', error: clip(message, 500) } });
    } else {
      console.warn(`[auto-slideshow] status of post ${postId} unknown:`, message);
      // A render that failed for good is a failed post, not one to poll forever.
      if (post.platform === 'youtube' && /failed to render|file is missing/.test(message)) await prisma.autoSlideshowPost.update({ where: { id: postId }, data: { status: 'failed', error: clip(message, 500) } });
    }
  }
};

/** Posts already sent through this account in the last 24 hours. */
const sentToday = (workspaceId: string, platform: string) =>
  prisma.autoSlideshowPost.count({ where: { workspaceId, platform, sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, status: { in: ['sending', 'processing', 'posted'] } } });

/** One tick: recover stuck sends, send due posts within the limits, poll sent ones, refresh some stats, then move
 *  scheduled Blitz videos along (render near their time, post when due). */
export const runPostingTick = async (): Promise<{ sent: number; polled: number; deferred: number; stats: number; blitz: Awaited<ReturnType<typeof runBlitzScheduleTick>> }> => {
  await prisma.autoSlideshowPost.updateMany({ where: { status: 'sending', sentAt: { lt: new Date(Date.now() - STALE_SENDING_MS) } }, data: { status: 'scheduled' } });
  const due = await prisma.autoSlideshowPost.findMany({ where: { status: 'scheduled', scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: 'asc' }, take: 50 });
  const perAccount = new Map<string, number>();
  let sent = 0;
  let deferred = 0;
  for (const post of due) {
    const account = `${post.workspaceId}:${post.platform}`;
    const inTick = perAccount.get(account) ?? 0;
    if (inTick >= SENDS_PER_ACCOUNT_PER_TICK || (await sentToday(post.workspaceId, post.platform)) >= MAX_POSTS_PER_DAY) {
      deferred += 1;
      continue;
    }
    perAccount.set(account, inTick + 1);
    await sendPost(post.id);
    sent += 1;
  }
  const processing = await prisma.autoSlideshowPost.findMany({ where: { status: 'processing' }, orderBy: { sentAt: 'asc' }, take: POLLS_PER_TICK, select: { id: true } });
  for (const p of processing) await refreshPost(p.id);
  return { sent, polled: processing.length, deferred, stats: (await refreshDueStats()) + (await refreshBlitzIdeaStats()), blitz: await runBlitzScheduleTick() };
};

/** Smallest gap between two ticks started from page loads (the cron has its own schedule). */
const PAGE_TICK_GAP_MS = 30_000;
let lastPageTick = 0;

/**
 * A posting tick started by someone viewing a run, at most once per 30 s per server instance. The cron is the main
 * sender, but it is not on Vercel's schedule yet (Hobby allows only daily crons), so open pages keep posts moving:
 * due posts get sent, published ones flip to "posted", and their numbers stay fresh. Never throws.
 */
export const tickFromPage = async (): Promise<void> => {
  if (Date.now() - lastPageTick < PAGE_TICK_GAP_MS) return;
  lastPageTick = Date.now();
  await runPostingTick().catch((err: unknown) => console.warn('[auto-slideshow] page tick failed:', err instanceof Error ? err.message : err));
};
