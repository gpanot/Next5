// server-only — never import from a 'use client' file.
// A calendar slot booked by a realtor playbook: what it shows (video or slides) and how far along it is.

import { getPresignedUrl } from '../../lib/r2';
import type { PlaybookSlide } from '../../types/business/campaigns';
import type { SlotPlaybookDto } from '../../types/business/calendar';
import type { SlotWithItem } from './calendar';

const SIGN_SECONDS = 24 * 3600;

const statusOf = (post: NonNullable<SlotWithItem['campaignPost']>): SlotPlaybookDto['status'] => {
  const video = post.listingVideo?.status;
  if (video) return video === 'ready' ? 'ready' : video === 'failed' ? 'failed' : 'generating';
  return post.mediaStatus as SlotPlaybookDto['status'];
};

export const playbookOf = async (slot: SlotWithItem): Promise<SlotPlaybookDto | null> => {
  const post = slot.campaignPost;
  if (!post?.beatKey) return null;
  const slides = (Array.isArray(post.slides) ? post.slides : []) as PlaybookSlide[];
  const slideUrls = (await Promise.all(slides.map((s) => getPresignedUrl(s.key, SIGN_SECONDS)))).filter((u): u is string => Boolean(u));
  const video = post.listingVideo;
  const videoUrl = video?.status === 'ready' && video.videoKey ? await getPresignedUrl(video.videoKey, SIGN_SECONDS) : null;
  return {
    campaignId: post.campaignId,
    format: post.format === 'listing_video' ? 'listing_video' : 'slideshow',
    idea: post.idea,
    status: statusOf(post),
    caption: slot.captionOverride ?? post.caption,
    coverUrl: slideUrls[0] ?? null,
    videoUrl,
    slideUrls,
  };
};
