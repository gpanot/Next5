// server-only — never import from a 'use client' file.

import { isPostPlatform, type PostPlatform } from '../../types/admin/autoSlideshow';
import { HttpError } from '../http';
import type { TikTokChoices, YouTubeChoices } from './posting';

type Parsed = { platforms: PostPlatform[]; tiktok: TikTokChoices | null; youtube: YouTubeChoices | null };

/** `platforms` and each platform's own choices (TikTok's privacy and consent, YouTube's privacy), from a request body. */
export const parsePlatforms = (body: Record<string, unknown>): Parsed => {
  const platforms = [...new Set((Array.isArray(body.platforms) ? body.platforms : []).filter(isPostPlatform))];
  if (platforms.length === 0) throw new HttpError(400, 'no_platform', 'Pick where to post.');
  const y = (body.youtube ?? {}) as Record<string, unknown>;
  const youtube = platforms.includes('youtube') ? { privacyLevel: typeof y.privacyLevel === 'string' ? y.privacyLevel : 'private' } : null;
  if (!platforms.includes('tiktok')) return { platforms, tiktok: null, youtube };
  const t = (body.tiktok ?? {}) as Record<string, unknown>;
  if (typeof t.privacyLevel !== 'string' || !t.privacyLevel) throw new HttpError(400, 'bad_privacy', 'Pick who can see the TikTok posts.');
  return {
    platforms,
    youtube,
    tiktok: { privacyLevel: t.privacyLevel, allowComments: t.allowComments !== false, brandOrganic: t.brandOrganic === true, brandContent: t.brandContent === true, consent: t.consent === true },
  };
};
