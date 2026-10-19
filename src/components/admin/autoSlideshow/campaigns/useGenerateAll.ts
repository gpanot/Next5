'use client';

import { useCallback } from 'react';
import type { PhotoOptionDto } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';
import type { useAutoContent } from './useAutoContent';
import type { CampaignState } from './useCampaign';

/** Stock photos for the hook slide: the first `n` results of the hooks' photo search (as "Choose for me" picks them). */
const hookPhotoPicks = async (token: string, campaignId: string, query: string, n: number): Promise<PhotoOptionDto[]> => {
  if (!query || n <= 0) return [];
  const { options } = await adminFetch<{ options: PhotoOptionDto[] }>(token, `/api/slideshow/campaigns/${campaignId}/photo-options?tab=search&q=${encodeURIComponent(query)}&page=1`);
  return options.slice(0, n);
};

/**
 * "Generate the entire slideshows" from the hooks dialog: puts the hooks just written in the draft, writes the content
 * slides from them (Auto, with its photos), then fills the hook photos up to one per hook. Resolves true once the text
 * is on every slide; photos keep coming in.
 */
export const useGenerateAll = (token: string, campaignId: string, state: CampaignState, auto: ReturnType<typeof useAutoContent>) =>
  useCallback(async (hooks: string[], photoQuery: string): Promise<boolean> => {
    state.setDraft((d) => ({ ...d, hooks, ...(photoQuery ? { hookPhotoQuery: photoQuery } : {}) }));
    if (!(await auto.run(hooks))) return false;
    const have = state.campaign?.draft.hookPhotos.length ?? 0;
    const picks = await hookPhotoPicks(token, campaignId, photoQuery, hooks.length - have).catch(() => []);
    if (picks.length > 0) void state.importPhotos(picks, { slot: 'hook' });
    return true;
  }, [token, campaignId, state, auto]);
