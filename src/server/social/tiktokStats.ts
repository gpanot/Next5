// server-only — never import from a 'use client' file.
// TikTok Display API: a post's numbers (video.list scope) and the account's totals (user.info.stats scope). Accounts
// connected before these scopes were added must reconnect. Docs:
//   developers.tiktok.com/doc/tiktok-api-v2-video-query
//   developers.tiktok.com/doc/tiktok-api-v2-get-user-info

import type { PostStats } from '../../types/admin/autoSlideshow';
import type { TikTokAccountStatsDto } from '../../types/admin/slideshowAnalytics';
import { providerFetch } from './http';

const API = 'https://open.tiktokapis.com/v2';
const VIDEO_FIELDS = 'id,view_count,like_count,comment_count,share_count';
const USER_FIELDS = 'follower_count,following_count,likes_count,video_count';

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Views, likes, comments and shares of one public post; null when TikTok does not return it (private, removed). */
export const fetchTikTokStats = async (token: string, postId: string): Promise<PostStats | null> => {
  const body = await providerFetch('tiktok', `${API}/video/query/?fields=${VIDEO_FIELDS}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ filters: { video_ids: [postId] } }),
  });
  const v = ((body.data as { videos?: Array<Record<string, unknown>> } | undefined)?.videos ?? [])[0];
  if (!v) return null;
  return { views: num(v.view_count), likes: num(v.like_count), comments: num(v.comment_count), shares: num(v.share_count) };
};

/** The connected account's followers, total likes and post count, as TikTok shows them now. */
export const fetchTikTokAccountStats = async (token: string): Promise<TikTokAccountStatsDto> => {
  const body = await providerFetch('tiktok', `${API}/user/info/?fields=${USER_FIELDS}`, { headers: { Authorization: `Bearer ${token}` } });
  const u = ((body.data as { user?: Record<string, unknown> } | undefined)?.user ?? {}) as Record<string, unknown>;
  return { followers: num(u.follower_count) ?? null, following: num(u.following_count) ?? null, likes: num(u.likes_count) ?? null, posts: num(u.video_count) ?? null };
};
