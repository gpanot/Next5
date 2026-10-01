// server-only — never import from a 'use client' file.
// Phase 4: approval-first posting to TikTok and Instagram. A person picks the platforms and, for TikTok, the privacy
// (from the creator's own options) and consents; each approved slideshow gets a time and one post per platform. The
// tick (send.ts) sends posts when due, follows them until they are live, then keeps their numbers fresh (stats.ts).

import type { AutoSlideshowPost } from '@prisma/client';
import { prisma } from '../../lib/db';
import { PLATFORM_LABELS, type AutoPostDto, type AutoPostStatus, type PostPlatform, type PostStats, type RunAccountsDto, type TikTokWorkspaceDto } from '../../types/admin/autoSlideshow';
import { HttpError } from '../http';
import { freshAccessToken } from '../social/connections';
import { instagram } from '../social/instagram';
import { tiktok } from '../social/tiktok';
import { queryCreatorInfo, type CreatorInfo } from '../social/tiktokCarousel';
import { sendPost } from './send';

export const connectionFor = async (workspaceId: string, platform: PostPlatform = 'tiktok') => {
  const conn = await prisma.socialConnection.findUnique({ where: { workspaceId_provider: { workspaceId, provider: platform } } });
  if (!conn) throw new HttpError(409, 'not_connected', `This workspace has no ${PLATFORM_LABELS[platform]} account connected. Connect it in Settings → Accounts.`);
  return conn;
};

/** Workspaces with a TikTok account connected, for the run's picker. `only` limits it to one workspace (a signed-in user's own). */
export const listTikTokWorkspaces = async (only?: string): Promise<TikTokWorkspaceDto[]> => {
  const rows = await prisma.socialConnection.findMany({ where: { provider: 'tiktok', ...(only ? { workspaceId: only } : {}) }, include: { workspace: { select: { name: true } } }, orderBy: { updatedAt: 'desc' } });
  return rows.map((c) => ({ workspaceId: c.workspaceId, workspaceName: c.workspace.name, username: c.username, avatarUrl: c.avatarUrl }));
};

/** The run's workspace accounts per platform, for the approval and post-now forms. */
export const runAccounts = async (workspaceId: string | null): Promise<RunAccountsDto> => {
  const rows = workspaceId ? await prisma.socialConnection.findMany({ where: { workspaceId } }) : [];
  const accounts: RunAccountsDto['accounts'] = {};
  for (const c of rows) if (c.provider === 'tiktok' || c.provider === 'instagram') accounts[c.provider] = { username: c.username, avatarUrl: c.avatarUrl };
  return { workspaceId, accounts, configured: { tiktok: tiktok.configured(), instagram: instagram.configured() } };
};

export const setRunWorkspace = async (runId: string, workspaceId: string | null): Promise<void> => {
  if (workspaceId) await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { id: true } });
  await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { workspaceId } });
};

/** Live creator info (TikTok requires it before every post, and the approver must see it). */
export const creatorInfoFor = async (workspaceId: string): Promise<CreatorInfo> => {
  if (!tiktok.configured()) throw new HttpError(503, 'tiktok_not_configured', 'TikTok is not set up on this server: add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.');
  return queryCreatorInfo(await freshAccessToken(await connectionFor(workspaceId, 'tiktok')));
};

export const toPostDto = (p: AutoSlideshowPost): AutoPostDto => ({
  id: p.id,
  slideshowId: p.slideshowId,
  platform: p.platform === 'instagram' ? 'instagram' : 'tiktok',
  status: p.status as AutoPostStatus,
  scheduledAt: p.scheduledAt.toISOString(),
  privacyLevel: p.privacyLevel,
  postUrl: p.postUrl,
  error: p.error,
  attempts: p.attempts,
  postedAt: p.postedAt?.toISOString() ?? null,
  stats: (p.stats as PostStats | null) ?? null,
  statsAt: p.statsAt?.toISOString() ?? null,
});

export const listPosts = async (runId: string): Promise<AutoPostDto[]> =>
  (await prisma.autoSlideshowPost.findMany({ where: { runId }, orderBy: { scheduledAt: 'asc' } })).map(toPostDto);

/** TikTok's choices; required only when TikTok is one of the platforms. */
export type TikTokChoices = { privacyLevel: string; allowComments: boolean; brandOrganic: boolean; brandContent: boolean; consent: boolean };

export type ScheduleInput = {
  items: Array<{ slideshowId: string; scheduledAt: string }>;
  platforms: PostPlatform[];
  tiktok: TikTokChoices | null;
};

const LIVE = ['scheduled', 'sending', 'processing', 'posted'];

/** Checks TikTok's rules for this batch; returns what each TikTok post stores. */
const tiktokFields = async (workspaceId: string, choices: TikTokChoices | null) => {
  if (!choices) throw new HttpError(400, 'no_tiktok_choices', 'Pick who can see the TikTok posts.');
  if (choices.consent !== true) throw new HttpError(400, 'no_consent', 'Accept TikTok\'s Music Usage Confirmation first.');
  const creator = await creatorInfoFor(workspaceId);
  if (!creator.privacyOptions.includes(choices.privacyLevel)) throw new HttpError(400, 'bad_privacy', `Pick who can see the post: ${creator.privacyOptions.join(', ')}.`);
  if (choices.brandContent && choices.privacyLevel === 'SELF_ONLY') throw new HttpError(400, 'branded_private', 'Branded content cannot be private.');
  return { privacyLevel: choices.privacyLevel, allowComments: choices.allowComments && !creator.commentDisabled, brandOrganic: choices.brandOrganic, brandContent: choices.brandContent };
};

const INSTAGRAM_FIELDS = { privacyLevel: 'PUBLIC', allowComments: true, brandOrganic: false, brandContent: false };

/**
 * Approves and schedules slideshows on the run's workspace, one post per chosen platform. Re-scheduling a failed or
 * canceled post replaces it; a platform where the slideshow is already scheduled or posted is refused.
 */
export const schedulePosts = async (runId: string, input: ScheduleInput): Promise<AutoPostDto[]> => {
  const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: runId }, select: { workspaceId: true } });
  if (!run.workspaceId) throw new HttpError(409, 'no_workspace', 'Pick the workspace whose accounts will post.');
  if (input.platforms.length === 0) throw new HttpError(400, 'no_platform', 'Pick TikTok, Instagram or both.');
  const fields: Partial<Record<PostPlatform, typeof INSTAGRAM_FIELDS>> = {};
  for (const platform of input.platforms) {
    await connectionFor(run.workspaceId, platform);
    fields[platform] = platform === 'tiktok' ? await tiktokFields(run.workspaceId, input.tiktok) : INSTAGRAM_FIELDS;
  }
  const shows = await prisma.autoSlideshow.findMany({ where: { runId, id: { in: input.items.map((i) => i.slideshowId) } }, include: { posts: true } });
  const now = new Date();
  for (const item of input.items) {
    const show = shows.find((s) => s.id === item.slideshowId);
    const at = new Date(item.scheduledAt);
    if (!show || show.status !== 'ready') throw new HttpError(400, 'not_ready', 'Only ready slideshows can be scheduled.');
    if (Number.isNaN(at.getTime())) throw new HttpError(400, 'bad_time', 'Every post needs a time.');
    for (const platform of input.platforms) {
      const existing = show.posts.find((p) => p.platform === platform);
      if (existing && LIVE.includes(existing.status)) throw new HttpError(409, 'already_scheduled', `"${show.topic}" is already scheduled or posted on ${PLATFORM_LABELS[platform]}.`);
      const data = {
        runId, workspaceId: run.workspaceId, status: 'scheduled', scheduledAt: at < now ? now : at, ...fields[platform]!,
        consentAt: now, publishId: null, tiktokPostId: null, postUrl: null, attempts: 0, error: null, sentAt: null, postedAt: null, stats: undefined, statsAt: null,
      };
      await prisma.autoSlideshowPost.upsert({ where: { slideshowId_platform: { slideshowId: show.id, platform } }, create: { slideshowId: show.id, platform, ...data }, update: data });
    }
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

export type PostNowInput = { workspaceId: string; platforms: PostPlatform[]; tiktok: TikTokChoices | null };

/** The editor's "Post now": approves this slideshow for now on each chosen platform and sends it. */
export const postSlideshowNow = async (runId: string, slideshowId: string, input: PostNowInput): Promise<AutoPostDto[]> => {
  const existing = await prisma.autoSlideshowPost.findMany({ where: { slideshowId, platform: { in: input.platforms } } });
  const busy = existing.find((p) => ['sending', 'processing', 'posted'].includes(p.status));
  if (busy) throw new HttpError(409, 'already_posted', `This slideshow is already posted or on its way on ${PLATFORM_LABELS[busy.platform as PostPlatform] ?? busy.platform}.`);
  await setRunWorkspace(runId, input.workspaceId);
  // A scheduled post is replaced by this one (same slideshow, sent now with the settings just chosen).
  const scheduled = existing.filter((p) => p.status === 'scheduled').map((p) => p.id);
  if (scheduled.length) await prisma.autoSlideshowPost.updateMany({ where: { id: { in: scheduled } }, data: { status: 'canceled' } });
  await schedulePosts(runId, { platforms: input.platforms, tiktok: input.tiktok, items: [{ slideshowId, scheduledAt: new Date().toISOString() }] });
  const posts = await prisma.autoSlideshowPost.findMany({ where: { slideshowId, platform: { in: input.platforms } } });
  for (const p of posts) await sendPost(p.id);
  return (await prisma.autoSlideshowPost.findMany({ where: { slideshowId } })).map(toPostDto);
};

/** Moves a scheduled or failed post to now and sends it. */
export const postNow = async (runId: string, postId: string): Promise<void> => {
  const post = await loadPost(runId, postId);
  if (!['scheduled', 'failed'].includes(post.status)) throw new HttpError(409, 'not_sendable', 'This post is already sent.');
  await prisma.autoSlideshowPost.update({ where: { id: postId }, data: { status: 'scheduled', scheduledAt: new Date(), error: null, attempts: post.status === 'failed' ? 0 : post.attempts } });
  await sendPost(postId);
};
