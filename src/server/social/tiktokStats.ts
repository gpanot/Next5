// server-only — never import from a 'use client' file.
// TikTok Display API: a post's numbers. Needs the video.list scope (accounts connected before it was added must
// reconnect). Docs: developers.tiktok.com/doc/tiktok-api-v2-video-query

import type { PostStats } from '../../types/admin/autoSlideshow';
import { providerFetch } from './http';

const FIELDS = 'id,view_count,like_count,comment_count,share_count';

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Views, likes, comments and shares of one public post; null when TikTok does not return it (private, removed). */
export const fetchTikTokStats = async (token: string, postId: string): Promise<PostStats | null> => {
  const body = await providerFetch('tiktok', `https://open.tiktokapis.com/v2/video/query/?fields=${FIELDS}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ filters: { video_ids: [postId] } }),
  });
  const v = ((body.data as { videos?: Array<Record<string, unknown>> } | undefined)?.videos ?? [])[0];
  if (!v) return null;
  return { views: num(v.view_count), likes: num(v.like_count), comments: num(v.comment_count), shares: num(v.share_count) };
};
