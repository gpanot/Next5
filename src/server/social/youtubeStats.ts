// server-only — never import from a 'use client' file.
// YouTube Data API v3: a Short's numbers (youtube.readonly scope). YouTube has no public share or save count.
// Docs: developers.google.com/youtube/v3/docs/videos/list

import type { PostStats } from '../../types/admin/autoSlideshow';
import { providerFetch } from './http';

const VIDEOS = 'https://www.googleapis.com/youtube/v3/videos';

/** YouTube sends counts as strings ("1234"); a hidden like count is simply missing. */
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};

/** Views, likes and comments of one video; null when YouTube does not return it (deleted). Costs 1 quota unit. */
export const fetchYouTubeStats = async (token: string, videoId: string): Promise<PostStats | null> => {
  const body = await providerFetch('youtube', `${VIDEOS}?part=statistics&id=${encodeURIComponent(videoId)}`, { headers: { Authorization: `Bearer ${token}` } });
  const s = ((body.items as Array<{ statistics?: Record<string, unknown> }> | undefined) ?? [])[0]?.statistics;
  if (!s) return null;
  return { views: num(s.viewCount), likes: num(s.likeCount), comments: num(s.commentCount) };
};
