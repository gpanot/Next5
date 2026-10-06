// server-only — never import from a 'use client' file.
// Moves scheduled Blitz videos along, one step per tick (run with the Auto Slideshow posting tick):
//   planned → failed        its time came and it was never approved on the calendar: the credit is refunded
//   scheduled → rendering   about an hour before the post time: queue the render (paid when scheduled)
//   rendering → sending     once the MP4 is ready and the post is due: Direct Post to TikTok, or upload as a YouTube Short
//   processing → posted     the platform says it is live
// Every step claims its row first, so two ticks never act twice.

import type { BlitzScheduledPost } from '@prisma/client';
import { prisma } from '../../lib/db';
import { BLITZ_RENDER_LEAD_MS } from '../../types/admin/blitzSchedule';
import { connectionFor } from '../autoSlideshow/posting';
import { clip } from '../metaAds/text';
import { isPrepaid, refundBlitzCharge, refundFailedRender } from '../slideshowCredits/blitzCharge';
import { freshAccessToken } from '../social/connections';
import { blitzVideoMediaUrl, mediaBaseUrl, mediaIsPublic } from '../social/links';
import { fetchPublishStatus, queryCreatorInfo } from '../social/tiktokCarousel';
import { getObject } from '../storage/objectStore';
import { isYouTubePrivacy, shortState, uploadShort } from '../social/youtubeUpload';
import { initVideo } from '../social/tiktokVideo';
import { queueBlitzRender, type RenderBody } from './blitzRender';

const PER_TICK = 10;
/** A row claimed for rendering but with no render after this long crashed mid-step: it is tried again. */
const STALE_CLAIM_MS = 10 * 60 * 1000;

const errorText = (err: unknown) => clip(err instanceof Error ? err.message : String(err), 500);

const fail = (id: string, error: string) => prisma.blitzScheduledPost.update({ where: { id }, data: { status: 'failed', error } });

/** Queues the render of one post whose time is near. */
const startRender = async (post: BlitzScheduledPost): Promise<void> => {
  const claimed = await prisma.blitzScheduledPost.updateMany({ where: { id: post.id, status: 'scheduled' }, data: { status: 'rendering', attempts: { increment: 1 } } });
  if (claimed.count === 0) return;
  try {
    const prepaid = await isPrepaid(post.id);
    const project = await queueBlitzRender({ admin: false, userId: post.userId, workspaceId: post.workspaceId }, post.renderBody as unknown as RenderBody, prepaid);
    await prisma.blitzScheduledPost.update({ where: { id: post.id }, data: { projectId: project.id, error: null } });
  } catch (err) {
    await refundBlitzCharge(post.id, 'Scheduled Blitz video failed');
    await fail(post.id, `Could not make the video: ${errorText(err)}`);
  }
};

/** Uploads the rendered MP4 to the workspace's YouTube channel as a Short; YouTube then checks it (see followPublish). */
const sendYouTube = async (post: BlitzScheduledPost): Promise<void> => {
  const project = await prisma.blitzProject.findUnique({ where: { id: post.projectId! }, select: { renderedVideoKey: true } });
  const mp4 = project?.renderedVideoKey ? await getObject(project.renderedVideoKey) : null;
  if (!mp4) throw new Error('The rendered video file is missing. Schedule it again.');
  const videoId = await uploadShort(await freshAccessToken(await connectionFor(post.workspaceId, 'youtube')), {
    title: post.title,
    description: post.title,
    tags: [],
    privacy: isYouTubePrivacy(post.privacyLevel) ? post.privacyLevel : 'private',
    video: mp4,
  });
  await prisma.blitzScheduledPost.update({ where: { id: post.id }, data: { status: 'processing', publishId: videoId, tiktokPostId: videoId, postUrl: `https://www.youtube.com/shorts/${videoId}`, error: null } });
};

/** Direct Post of the rendered MP4. */
const sendVideo = async (post: BlitzScheduledPost): Promise<void> => {
  const claimed = await prisma.blitzScheduledPost.updateMany({ where: { id: post.id, status: 'rendering' }, data: { status: 'sending', sentAt: new Date() } });
  if (claimed.count === 0) return;
  try {
    if (post.platform === 'youtube') {
      if (!post.consentAt) throw new Error('This video was never approved.');
      return await sendYouTube(post);
    }
    if (!mediaIsPublic()) throw new Error(`TikTok cannot download videos from ${mediaBaseUrl()}. Set MEDIA_PUBLIC_URL to the live https site.`);
    const token = await freshAccessToken(await connectionFor(post.workspaceId, 'tiktok'));
    const creator = await queryCreatorInfo(token);
    if (!post.privacyLevel || !post.consentAt) throw new Error('This video was never approved.');
    if (!creator.privacyOptions.includes(post.privacyLevel)) throw new Error(`The account no longer allows "${post.privacyLevel}". Schedule it again with another privacy.`);
    const publishId = await initVideo(token, {
      videoUrl: blitzVideoMediaUrl(post.projectId!),
      title: post.title,
      privacyLevel: post.privacyLevel,
      allowComments: post.allowComments && !creator.commentDisabled,
      brandOrganic: post.brandOrganic,
      brandContent: post.brandContent,
    });
    const profile = creator.username ? `https://www.tiktok.com/@${creator.username}` : null;
    await prisma.blitzScheduledPost.update({ where: { id: post.id }, data: { status: 'processing', publishId, postUrl: profile, error: null } });
  } catch (err) {
    await fail(post.id, errorText(err));
  }
};

/** Follows a render: posts it when ready and due, fails the post when the render failed. */
const followRender = async (post: BlitzScheduledPost, now: number): Promise<void> => {
  if (!post.projectId) {
    if (now - post.updatedAt.getTime() > STALE_CLAIM_MS) await prisma.blitzScheduledPost.updateMany({ where: { id: post.id, status: 'rendering', projectId: null }, data: { status: 'scheduled' } });
    return;
  }
  const project = await prisma.blitzProject.findUnique({ where: { id: post.projectId }, select: { renderStatus: true } });
  if (!project || project.renderStatus === 'FAILED') {
    await refundFailedRender(post.projectId);
    await refundBlitzCharge(post.id, 'Scheduled Blitz video failed');
    await fail(post.id, 'The video could not be made. Your credit was refunded. Schedule it again.');
  } else if (project.renderStatus === 'COMPLETED' && post.scheduledAt.getTime() <= now) {
    await sendVideo(post);
  }
};

/** Asks the platform how a sent video is doing. */
const followPublish = async (post: BlitzScheduledPost): Promise<void> => {
  try {
    if (post.platform === 'youtube') {
      const state = await shortState(await freshAccessToken(await connectionFor(post.workspaceId, 'youtube')), post.publishId!);
      if (state.state === 'posted') await prisma.blitzScheduledPost.update({ where: { id: post.id }, data: { status: 'posted', postedAt: new Date(), error: null } });
      else if (state.state === 'failed') await fail(post.id, clip(`YouTube: ${state.reason}`, 500));
      return;
    }
    const state = await fetchPublishStatus(await freshAccessToken(await connectionFor(post.workspaceId, 'tiktok')), post.publishId!);
    if (state.state === 'posted') {
      const postUrl = state.postId && post.postUrl ? `${post.postUrl}/video/${state.postId}` : post.postUrl;
      await prisma.blitzScheduledPost.update({ where: { id: post.id }, data: { status: 'posted', tiktokPostId: state.postId, postUrl, postedAt: new Date(), error: null } });
    } else if (state.state === 'failed') {
      await fail(post.id, clip(`TikTok: ${state.reason}`, 500));
    }
  } catch (err) {
    console.warn(`[blitz-schedule] status of post ${post.id} unknown:`, errorText(err));
  }
};

/** Planned videos whose time came without an approval: off the calendar, credit back. */
const expireUnapproved = async (now: number): Promise<void> => {
  const missed = await prisma.blitzScheduledPost.findMany({ where: { status: 'planned', scheduledAt: { lte: new Date(now) } }, select: { id: true }, take: PER_TICK });
  for (const { id } of missed) {
    const done = await prisma.blitzScheduledPost.updateMany({ where: { id, status: 'planned' }, data: { status: 'failed', error: 'Not approved in time. Your credit was refunded.' } });
    if (done.count > 0) await refundBlitzCharge(id, 'Scheduled Blitz video not approved');
  }
};

/** One tick. Never throws. */
export async function runBlitzScheduleTick(): Promise<{ rendering: number; followed: number; polled: number }> {
  try {
    const now = Date.now();
    await expireUnapproved(now);
    const due = await prisma.blitzScheduledPost.findMany({ where: { status: 'scheduled', scheduledAt: { lte: new Date(now + BLITZ_RENDER_LEAD_MS) } }, orderBy: { scheduledAt: 'asc' }, take: PER_TICK });
    for (const post of due) await startRender(post);
    const rendering = await prisma.blitzScheduledPost.findMany({ where: { status: 'rendering' }, orderBy: { scheduledAt: 'asc' }, take: PER_TICK });
    for (const post of rendering) await followRender(post, now);
    const processing = await prisma.blitzScheduledPost.findMany({ where: { status: 'processing', publishId: { not: null } }, orderBy: { sentAt: 'asc' }, take: PER_TICK });
    for (const post of processing) await followPublish(post);
    return { rendering: due.length, followed: rendering.length, polled: processing.length };
  } catch (err) {
    console.warn('[blitz-schedule] tick failed:', errorText(err));
    return { rendering: 0, followed: 0, polled: 0 };
  }
}
