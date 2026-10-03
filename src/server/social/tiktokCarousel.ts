// server-only — never import from a 'use client' file.
// TikTok Content Posting API for photo carousels (Direct Post). Docs:
//   developers.tiktok.com/doc/content-posting-api-reference-photo-post
//   developers.tiktok.com/doc/content-posting-api-reference-query-creator-info
//   developers.tiktok.com/doc/content-posting-api-reference-get-video-status
// Rules we follow: query creator info before each post; privacy is chosen by a person from the creator's own options;
// branded content cannot be private; photos are pulled from our verified URL prefix.

import { providerFetch } from './http';

const API = 'https://open.tiktokapis.com/v2';
/** TikTok caps: 35 photos per carousel, 90-character title, 4,000-character description. */
export const MAX_PHOTOS = 35;
const TITLE_MAX = 90;
const DESCRIPTION_MAX = 4_000;

export const post = (token: string, path: string, body: unknown) =>
  providerFetch('tiktok', `${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body),
  });

export type CreatorInfo = {
  nickname: string;
  username: string;
  avatarUrl: string | null;
  /** Unaudited apps get only SELF_ONLY here. */
  privacyOptions: string[];
  commentDisabled: boolean;
};

export const queryCreatorInfo = async (token: string): Promise<CreatorInfo> => {
  const body = await post(token, '/post/publish/creator_info/query/', {});
  const d = (body.data ?? {}) as Record<string, unknown>;
  return {
    nickname: String(d.creator_nickname ?? ''),
    username: String(d.creator_username ?? ''),
    avatarUrl: typeof d.creator_avatar_url === 'string' ? d.creator_avatar_url : null,
    privacyOptions: Array.isArray(d.privacy_level_options) ? d.privacy_level_options.map(String) : [],
    commentDisabled: d.comment_disabled === true,
  };
};

export type CarouselInput = {
  photoUrls: string[];
  title: string;
  description: string;
  privacyLevel: string;
  allowComments: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
};

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Request body for one Direct Post photo carousel. Exported for tests. */
export const carouselBody = (input: CarouselInput) => ({
  media_type: 'PHOTO',
  post_mode: 'DIRECT_POST',
  post_info: {
    title: clip(input.title, TITLE_MAX),
    description: clip(input.description, DESCRIPTION_MAX),
    privacy_level: input.privacyLevel,
    disable_comment: !input.allowComments,
    // TikTok picks a trending sound for the carousel.
    auto_add_music: true,
    brand_organic_toggle: input.brandOrganic,
    brand_content_toggle: input.brandContent,
  },
  source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: input.photoUrls.slice(0, MAX_PHOTOS) },
});

/** Starts the post; TikTok then downloads the photos and publishes. Returns the publish id to poll. */
export const initCarousel = async (token: string, input: CarouselInput): Promise<string> => {
  if (input.brandContent && input.privacyLevel === 'SELF_ONLY') throw new Error('Branded content cannot be private on TikTok');
  const body = await post(token, '/post/publish/content/init/', carouselBody(input));
  const id = (body.data as { publish_id?: string } | undefined)?.publish_id;
  if (!id) throw new Error('TikTok returned no publish id');
  return id;
};

export type PublishState =
  | { state: 'processing' }
  | { state: 'posted'; postId: string | null }
  | { state: 'failed'; reason: string };

/**
 * The first public post id, read from the raw response text: TikTok sends it as a 19-digit JSON number, which
 * JSON.parse would round (anything above 2^53), giving a link to the wrong post. Exported for tests.
 */
export const postIdFromRaw = (raw: string): string | null => raw.match(/"publicaly_available_post_id"\s*:\s*\[\s*"?(\d+)/)?.[1] ?? null;

export const fetchPublishStatus = async (token: string, publishId: string): Promise<PublishState> => {
  let raw = '';
  const body = await providerFetch('tiktok', `${API}/post/publish/status/fetch/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ publish_id: publishId }),
    // Keep the raw text for the post id (see postIdFromRaw); providerFetch still handles errors.
    onRawText: (text) => { raw = text; },
  });
  const d = (body.data ?? {}) as { status?: string; fail_reason?: string };
  if (d.status === 'PUBLISH_COMPLETE') return { state: 'posted', postId: postIdFromRaw(raw) };
  if (d.status === 'FAILED') return { state: 'failed', reason: d.fail_reason ?? 'TikTok did not say why' };
  return { state: 'processing' };
};
