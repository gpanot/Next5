// server-only — never import from a 'use client' file.
// Moves scheduled Blitz videos along, one step per tick (run with the Auto Slideshow posting tick):
//   scheduled → rendering   about an hour before the post time: queue the render (the credit is charged now)
//   rendering → sending     once the MP4 is ready and the post is due: Direct Post to TikTok
//   processing → posted     TikTok says it is live
// Every step claims its row first, so two ticks never act twice.

import type { BlitzScheduledPost } from '@prisma/client';
import { prisma } from '../../lib/db';
import { BLITZ_RENDER_LEAD_MS } from '../../types/admin/blitzSchedule';
import { connectionFor } from '../autoSlideshow/posting';
import { clip } from '../metaAds/text';
import { refundFailedRender } from '../slideshowCredits/blitzCharge';
import { freshAccessToken } from '../social/connections';
import { blitzVideoMediaUrl, mediaBaseUrl, mediaIsPublic } from '../social/links';
import { fetchPublishStatus, queryCreatorInfo } from '../social/tiktokCarousel';
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
    const project = await queueBlitzRender({ admin: false, userId: post.userId, workspaceId: post.workspaceId }, post.renderBody as unknown as RenderBody);
    await prisma.blitzScheduledPost.update({ where: { id: post.id }, data: { projectId: project.id, error: null } });
  } catch (err) {
    await fail(post.id, `Could not make the video: ${errorText(err)}`);
  }
};

/** Direct Post of the rendered MP4. */
const sendVideo = async (post: BlitzScheduledPost): Promise<void> => {
  const claimed = await prisma.blitzScheduledPost.updateMany({ where: { id: post.id, status: 'rendering' }, data: { status: 'sending', sentAt: new Date() } });
  if (claimed.count === 0) return;
  try {
    if (!mediaIsPublic()) throw new Error(`TikTok cannot download videos from ${mediaBaseUrl()}. Set MEDIA_PUBLIC_URL to the live https site.`);
    const token = await freshAccessToken(await connectionFor(post.workspaceId, 'tiktok'));
    const creator = await queryCreatorInfo(token);
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
    await fail(post.id, 'The video could not be made. Your credit was refunded. Schedule it again.');
  } else if (project.renderStatus === 'COMPLETED' && post.scheduledAt.getTime() <= now) {
    await sendVideo(post);
  }
};

/** Asks TikTok how a sent video is doing. */
const followPublish = async (post: BlitzScheduledPost): Promise<void> => {
  try {
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

/** One tick. Never throws. */
export async function runBlitzScheduleTick(): Promise<{ rendering: number; followed: number; polled: number }> {
  try {
    const now = Date.now();
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
