'use client';

import { useCallback } from 'react';
import type { CampaignCtaText, AutoPhotoSource, PhotoOptionDto } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';
import type { useAutoContent } from './useAutoContent';
import type { CampaignState } from './useCampaign';

/** Search pages read at most for the hook photos (each is one Unsplash call; the app gets 50 an hour). */
const HOOK_PICK_PAGES = 3;

/** Stock photos for the hook slide: the first `n` results of the hooks' photo search that no other campaign of the
 *  workspace uses, so campaigns on the same subject do not all open on the same photos. */
const hookPhotoPicks = async (token: string, campaignId: string, query: string, n: number): Promise<PhotoOptionDto[]> => {
  if (!query || n <= 0) return [];
  const picks: PhotoOptionDto[] = [];
  for (let page = 1; page <= HOOK_PICK_PAGES && picks.length < n; page += 1) {
    const { options, hasMore } = await adminFetch<{ options: PhotoOptionDto[]; hasMore: boolean }>(token, `/api/slideshow/campaigns/${campaignId}/photo-options?tab=search&q=${encodeURIComponent(query)}&page=${page}&fresh=1`);
    picks.push(...options);
    if (!hasMore) break;
  }
  return picks.slice(0, n);
};

/** What the hooks endpoint returns for "Generate the entire slideshows". */
export type HooksWritten = { hooks: string[]; photoQuery: string; photoSource: AutoPhotoSource; cta: CampaignCtaText };

/**
 * "Generate the entire slideshows" from the hooks dialog: puts the hooks just written in the draft, writes the content
 * slides from them (Auto, its photos made with `photoSource`: stock until paid) and an empty CTA card's text and photo,
 * then fills the hook photos up to one per hook. Resolves true once the text is on every slide; photos keep coming in.
 */
export const useGenerateAll = (token: string, campaignId: string, state: CampaignState, auto: ReturnType<typeof useAutoContent>) =>
  useCallback(async ({ hooks, photoQuery, photoSource, cta }: HooksWritten): Promise<boolean> => {
    state.setDraft((d) => ({ ...d, hooks, ...(photoQuery ? { hookPhotoQuery: photoQuery } : {}) }));
    if (!(await auto.run({ hooks, photoSource, cta }))) return false;
    const have = state.campaign?.draft.hookPhotos.length ?? 0;
    const picks = await hookPhotoPicks(token, campaignId, photoQuery, hooks.length - have).catch(() => []);
    if (picks.length > 0) void state.importPhotos(picks, { slot: 'hook' });
    return true;
  }, [token, campaignId, state, auto]);
