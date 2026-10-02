// server-only — never import from a 'use client' file.
// A public TikTok post's numbers through treg (tiktok.video.detail, ~$0.001 a read), read from the post's page data
// instead of TikTok's Display API: no video.list scope needed, and it includes saves, which the official API lacks.
// Only public posts: a private post has no public page.

import type { PostStats } from '../../types/admin/autoSlideshow';
import { tregCall } from '../admin/ugcLab';

const ENDPOINT = 'treg.tiktok.video.detail';

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};

type Raw = Record<string, unknown>;

/** treg relays each provider's own video object: the app shape (`statistics.play_count`) or the web one (`stats.playCount`). */
export const parseTikTokPublicStats = (video: unknown): PostStats | null => {
  if (typeof video !== 'object' || video === null) return null;
  const v = video as Raw;
  const app = v.statistics as Raw | undefined;
  if (app && typeof app === 'object') {
    return { views: num(app.play_count), likes: num(app.digg_count), comments: num(app.comment_count), shares: num(app.share_count), saves: num(app.collect_count) };
  }
  const web = (v.statsV2 ?? v.stats) as Raw | undefined;
  if (web && typeof web === 'object') {
    return { views: num(web.playCount), likes: num(web.diggCount), comments: num(web.commentCount), shares: num(web.shareCount), saves: num(web.collectCount) };
  }
  return null;
};

/** Numbers of one public TikTok post by its id and link; null when no provider found it (private, removed). */
export const fetchTikTokPublicStats = async (postId: string, postUrl: string | null): Promise<PostStats | null> => {
  const body = await tregCall<{ output?: { video?: unknown } }>(ENDPOINT, {
    method: 'POST',
    body: { video_id: postId, ...(postUrl ? { url: postUrl } : {}) },
    timeoutMs: 30_000,
  });
  const stats = parseTikTokPublicStats(body.output?.video);
  return stats && stats.views !== undefined ? stats : null;
};
