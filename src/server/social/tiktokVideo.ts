// server-only — never import from a 'use client' file.
// TikTok Content Posting API for one video (Direct Post). Docs: developers.tiktok.com/doc/content-posting-api-reference-direct-post
// Same rules as photo carousels (tiktokCarousel.ts): creator info first, privacy picked by a person, and the MP4 is
// pulled from our verified URL prefix. Status is polled with fetchPublishStatus.

import { post } from './tiktokCarousel';

/** TikTok's caption limit for videos. */
const TITLE_MAX = 2_200;

export type VideoInput = {
  videoUrl: string;
  /** Caption, hashtags included. */
  title: string;
  privacyLevel: string;
  allowComments: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
};

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Request body for one Direct Post video. Exported for tests. */
export const videoBody = (input: VideoInput) => ({
  post_info: {
    title: clip(input.title, TITLE_MAX),
    privacy_level: input.privacyLevel,
    disable_comment: !input.allowComments,
    disable_duet: false,
    disable_stitch: false,
    brand_organic_toggle: input.brandOrganic,
    brand_content_toggle: input.brandContent,
    // Our slides are AI-made: TikTok asks for the AI-generated label.
    is_aigc: true,
  },
  source_info: { source: 'PULL_FROM_URL', video_url: input.videoUrl },
});

/** Starts the post; TikTok then downloads the MP4 and publishes. Returns the publish id to poll. */
export const initVideo = async (token: string, input: VideoInput): Promise<string> => {
  if (input.brandContent && input.privacyLevel === 'SELF_ONLY') throw new Error('Branded content cannot be private on TikTok');
  const body = await post(token, '/post/publish/video/init/', videoBody(input));
  const id = (body.data as { publish_id?: string } | undefined)?.publish_id;
  if (!id) throw new Error('TikTok returned no publish id');
  return id;
};
