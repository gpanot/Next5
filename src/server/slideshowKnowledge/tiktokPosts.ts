// server-only — never import from a 'use client' file.
// TikTok photo posts via treg. A single post (TikHub) and a creator's most popular posts (ScrapeCreators) return the app
// "aweme" object; keyword photo search (TikHub web) returns the web shape and only feeds the picker, since every import
// re-fetches its post by link.

import type { CandidateDto, ReferenceStats } from '../../types/admin/slideshowKnowledge';
import { tregCall } from '../admin/ugcLab';

type ImageVariant = { url_list?: string[]; width?: number; height?: number };

export type Aweme = {
  aweme_id?: string;
  desc?: string;
  create_time?: number;
  share_url?: string;
  author?: { unique_id?: string };
  statistics?: { play_count?: number; digg_count?: number; collect_count?: number; share_count?: number; comment_count?: number };
  image_post_info?: { images?: Array<{ display_image?: ImageVariant; thumbnail?: ImageVariant }> };
};

export type PhotoPost = {
  postId: string;
  url: string;
  creator: string;
  caption: string;
  stats: ReferenceStats;
  postedAt: Date | null;
  images: Array<{ url: string; width: number; height: number }>;
};

/** Cost per call through treg, micro-USD (catalog prices checked 2026-09-29). */
export const POST_FETCH_MICROS = 1_000;
export const CREATOR_PAGE_MICROS = 1_880;
export const SEARCH_PAGE_MICROS = 1_000;

const POST_ID_RE = /\/(?:video|photo)\/(\d{8,})/;
const SHORT_LINK_RE = /^https?:\/\/(?:vm|vt)\.tiktok\.com\/|^https?:\/\/(?:www\.)?tiktok\.com\/t\//i;

/** The numeric id in a full post link, or null for short links and anything else. */
export const postIdOf = (url: string): string | null => url.match(POST_ID_RE)?.[1] ?? null;

export const isTikTokLink = (url: string): boolean => POST_ID_RE.test(url) || SHORT_LINK_RE.test(url);

/** "@name" or a profile link → "name". */
export const handleOf = (raw: string): string =>
  raw.trim().replace(/^https?:\/\/(?:www\.)?tiktok\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0]!.trim();

/** TikTok serves HEIC first on some CDNs; pick a JPEG/WebP URL, which sharp and the vision model can read. */
const bestUrl = (variant: ImageVariant | undefined): string | null => {
  const list = variant?.url_list ?? [];
  return list.find((u) => /\.(jpe?g|webp)(\?|$)/i.test(u)) ?? list.find((u) => !/\.heic(\?|$)/i.test(u)) ?? list[0] ?? null;
};

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** A photo-mode post, or null for videos and incomplete records. */
export const toPhotoPost = (aweme: Aweme | undefined): PhotoPost | null => {
  const images = aweme?.image_post_info?.images ?? [];
  if (!aweme?.aweme_id || images.length === 0) return null;
  const creator = aweme.author?.unique_id ?? '';
  const s = aweme.statistics ?? {};
  return {
    postId: aweme.aweme_id,
    url: `https://www.tiktok.com/@${creator}/photo/${aweme.aweme_id}`,
    creator,
    caption: aweme.desc ?? '',
    stats: { views: num(s.play_count), likes: num(s.digg_count), saves: num(s.collect_count), shares: num(s.share_count), comments: num(s.comment_count) },
    postedAt: aweme.create_time ? new Date(aweme.create_time * 1000) : null,
    images: images.flatMap((img) => {
      const url = bestUrl(img.display_image);
      return url ? [{ url, width: img.display_image?.width ?? 1080, height: img.display_image?.height ?? 1350 }] : [];
    }),
  };
};

/** One post by link. Short links go through the share-link endpoint, which resolves the redirect. */
export const fetchPhotoPost = async (url: string): Promise<PhotoPost> => {
  const id = postIdOf(url);
  const data = id
    ? await tregCall<{ aweme_detail?: Aweme }>('tikhub.x.tiktok-app-v3-fetch-one-video', { query: { aweme_id: id }, timeoutMs: 30_000 })
    : await tregCall<{ aweme_detail?: Aweme }>('tikhub.x.tiktok-app-v3-fetch-one-video-by-share-url', { query: { share_url: url }, timeoutMs: 30_000 });
  const post = toPhotoPost(data.aweme_detail);
  if (!post) throw new Error(data.aweme_detail ? 'This post is a video, not a photo slideshow' : 'TikTok did not return this post');
  if (post.images.length < 2) throw new Error('This post has fewer than 2 slides');
  return post;
};

const toCandidate = (post: PhotoPost, coverUrl: string | null): Omit<CandidateDto, 'imported'> => ({
  postId: post.postId,
  url: post.url,
  creator: post.creator,
  caption: post.caption,
  coverUrl,
  slideCount: post.images.length,
  stats: post.stats,
  postedAt: post.postedAt?.toISOString() ?? null,
});

const photoCandidates = (awemes: Aweme[]) =>
  awemes.flatMap((aweme) => {
    const post = toPhotoPost(aweme);
    const cover = bestUrl(aweme.image_post_info?.images?.[0]?.thumbnail) ?? post?.images[0]?.url ?? null;
    return post && post.images.length >= 2 ? [toCandidate(post, cover)] : [];
  });

/** A creator's most popular photo posts, best first. Two pages at most (about 20 posts looked at). */
export const creatorCandidates = async (handle: string, limit: number): Promise<{ candidates: Omit<CandidateDto, 'imported'>[]; costMicros: number }> => {
  const found: Aweme[] = [];
  let cursor: string | undefined;
  let pages = 0;
  while (pages < 2) {
    const data = await tregCall<{ aweme_list?: Aweme[]; has_more?: number; max_cursor?: number }>('scrapecreators.x.v3-tiktok-profile-videos', {
      query: { handle, sort_by: 'popular', region: 'US', ...(cursor ? { max_cursor: cursor } : {}) },
      timeoutMs: 45_000,
    });
    pages += 1;
    found.push(...(data.aweme_list ?? []));
    if (!data.has_more || !data.max_cursor || photoCandidates(found).length >= limit) break;
    cursor = String(data.max_cursor);
  }
  const candidates = photoCandidates(found).sort((a, b) => b.stats.views - a.stats.views).slice(0, limit);
  return { candidates, costMicros: pages * CREATOR_PAGE_MICROS };
};

/** TikTok web API shape, returned by the photo search. */
type WebItem = {
  id?: string;
  desc?: string;
  createTime?: number;
  author?: { uniqueId?: string };
  stats?: { playCount?: number; diggCount?: number; collectCount?: number; shareCount?: number; commentCount?: number };
  imagePost?: { cover?: { imageURL?: { urlList?: string[] } }; images?: unknown[] };
};

const fromWebItem = (item: WebItem): Omit<CandidateDto, 'imported'> | null => {
  const slideCount = item.imagePost?.images?.length ?? 0;
  if (!item.id || slideCount < 2) return null;
  const creator = item.author?.uniqueId ?? '';
  const s = item.stats ?? {};
  return {
    postId: item.id,
    url: `https://www.tiktok.com/@${creator}/photo/${item.id}`,
    creator,
    caption: item.desc ?? '',
    coverUrl: item.imagePost?.cover?.imageURL?.urlList?.[0] ?? null,
    slideCount,
    stats: { views: num(s.playCount), likes: num(s.diggCount), saves: num(s.collectCount), shares: num(s.shareCount), comments: num(s.commentCount) },
    postedAt: item.createTime ? new Date(item.createTime * 1000).toISOString() : null,
  };
};

/** Photo posts matching a keyword (TikTok's photo search), sorted here by views, best first. */
export const keywordCandidates = async (keyword: string, limit: number): Promise<{ candidates: Omit<CandidateDto, 'imported'>[]; costMicros: number }> => {
  const data = await tregCall<{ item_list?: WebItem[] }>('tikhub.x.tiktok-web-fetch-search-photo', { query: { keyword, count: 30 }, timeoutMs: 45_000 });
  const candidates = (data.item_list ?? []).flatMap((item) => fromWebItem(item) ?? []).sort((a, b) => b.stats.views - a.stats.views).slice(0, limit);
  return { candidates, costMicros: SEARCH_PAGE_MICROS };
};
