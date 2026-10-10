// server-only — never import from a 'use client' file.
// Instagram API with Instagram Login: carousel posts and their numbers. Docs:
//   developers.facebook.com/docs/instagram-platform/content-publishing (carousel: item containers → parent → publish)
//   developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights
// Photos are pulled by Meta from our public JPEG links, cut to 4:5 (Instagram allows 4:5 to 1.91:1; slides are 9:16).

import type { PostStats } from '../../types/admin/autoSlideshow';
import { form, providerFetch } from './http';

const GRAPH = 'https://graph.instagram.com/v23.0';
/** Instagram's carousel limit through the API. */
export const MAX_IG_PHOTOS = 10;
const CAPTION_MAX = 2_200;
const MAX_HASHTAGS = 30;

const withToken = (path: string, token: string, fields?: string) =>
  `${GRAPH}${path}?${new URLSearchParams({ ...(fields ? { fields } : {}), access_token: token }).toString()}`;

/** Caption + hashtags under Instagram's limits (2,200 characters, 30 hashtags). */
export const instagramCaption = (caption: string, hashtags: string[]) =>
  [caption.trim(), hashtags.slice(0, MAX_HASHTAGS).map((h) => `#${h}`).join(' ')].filter(Boolean).join('\n\n').slice(0, CAPTION_MAX);

/** Item containers, then the carousel container. Returns the carousel container id (publish it once FINISHED). */
export const createCarousel = async (token: string, igUserId: string, photoUrls: string[], caption: string): Promise<string> => {
  if (photoUrls.length < 2) throw new Error('An Instagram carousel needs at least 2 slides.');
  if (photoUrls.length > MAX_IG_PHOTOS) throw new Error(`Instagram carousels take up to ${MAX_IG_PHOTOS} slides; this one has ${photoUrls.length}. Delete some slides, then retry.`);
  const children: string[] = [];
  for (const url of photoUrls) {
    const item = await providerFetch('instagram', `${GRAPH}/${igUserId}/media`, form({ image_url: url, is_carousel_item: 'true', access_token: token }));
    children.push(String(item.id ?? ''));
  }
  const parent = await providerFetch('instagram', `${GRAPH}/${igUserId}/media`, form({ media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token }));
  const id = String(parent.id ?? '');
  if (!id) throw new Error('Instagram returned no container id');
  return id;
};

export type ContainerState = 'FINISHED' | 'IN_PROGRESS' | 'ERROR' | 'EXPIRED' | 'PUBLISHED';

export const containerStatus = async (token: string, containerId: string): Promise<{ state: ContainerState; detail: string }> => {
  const body = await providerFetch('instagram', withToken(`/${containerId}`, token, 'status_code,status'));
  return { state: String(body.status_code ?? 'IN_PROGRESS') as ContainerState, detail: String(body.status ?? '') };
};

/** Publishes a FINISHED container. Returns the media id and its public link. */
export const publishContainer = async (token: string, igUserId: string, containerId: string): Promise<{ mediaId: string; permalink: string | null }> => {
  const published = await providerFetch('instagram', `${GRAPH}/${igUserId}/media_publish`, form({ creation_id: containerId, access_token: token }));
  const mediaId = String(published.id ?? '');
  const media = await providerFetch('instagram', withToken(`/${mediaId}`, token, 'permalink')).catch(() => ({}) as Record<string, unknown>);
  return { mediaId, permalink: typeof media.permalink === 'string' ? media.permalink : null };
};

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Insights come as [{ name, values: [{ value }] }] (or total_value). */
const readInsights = (body: Record<string, unknown>): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const m of (Array.isArray(body.data) ? body.data : []) as Array<{ name?: string; values?: Array<{ value?: unknown }>; total_value?: { value?: unknown } }>) {
    const value = num(m.values?.[0]?.value) ?? num(m.total_value?.value);
    if (m.name && value !== undefined) out[m.name] = value;
  }
  return out;
};

/** Likes and comments (basic access), plus views, reach, saves and shares when insights are granted. */
export const fetchInstagramStats = async (token: string, mediaId: string): Promise<PostStats> => {
  const media = await providerFetch('instagram', withToken(`/${mediaId}`, token, 'like_count,comments_count'));
  const query = new URLSearchParams({ metric: 'views,reach,saved,shares', access_token: token });
  const insights = await providerFetch('instagram', `${GRAPH}/${mediaId}/insights?${query.toString()}`)
    .then(readInsights)
    .catch(() => ({}) as Record<string, number>);
  return { likes: num(media.like_count), comments: num(media.comments_count), views: insights.views, reach: insights.reach, saves: insights.saved, shares: insights.shares };
};
