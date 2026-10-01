// server-only — never import from a 'use client' file.

import { isPostPlatform, type PostPlatform } from '../../types/admin/autoSlideshow';
import { HttpError } from '../http';
import type { TikTokChoices } from './posting';

/** `platforms` and, when TikTok is one of them, TikTok's choices, from a request body. */
export const parsePlatforms = (body: Record<string, unknown>): { platforms: PostPlatform[]; tiktok: TikTokChoices | null } => {
  const platforms = [...new Set((Array.isArray(body.platforms) ? body.platforms : []).filter(isPostPlatform))];
  if (platforms.length === 0) throw new HttpError(400, 'no_platform', 'Pick TikTok, Instagram or both.');
  if (!platforms.includes('tiktok')) return { platforms, tiktok: null };
  const t = (body.tiktok ?? {}) as Record<string, unknown>;
  if (typeof t.privacyLevel !== 'string' || !t.privacyLevel) throw new HttpError(400, 'bad_privacy', 'Pick who can see the TikTok posts.');
  return {
    platforms,
    tiktok: { privacyLevel: t.privacyLevel, allowComments: t.allowComments !== false, brandOrganic: t.brandOrganic === true, brandContent: t.brandContent === true, consent: t.consent === true },
  };
};
