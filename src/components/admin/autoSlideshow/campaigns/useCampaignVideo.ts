'use client';

import { useSyncExternalStore } from 'react';
import { renderStateOf, startVideoDownload, subscribeRenders } from '../videoRenders';
import type { useCampaign } from './useCampaign';

type CampaignState = ReturnType<typeof useCampaign>;

/**
 * The campaign's first slideshow (the one in the preview) as an MP4, for the admin's "Generate Video".
 * Makes the slideshows first when the slides changed since they were last made. The campaign id is its run id.
 */
export const useCampaignVideo = (token: string, campaignId: string, state: CampaignState) => {
  const showId = state.campaign?.slideshows[0]?.id ?? '';
  const render = useSyncExternalStore(subscribeRenders, () => renderStateOf(showId), () => renderStateOf(showId));
  const preparing = state.busy === 'generate';

  const generate = async () => {
    let campaign = state.campaign;
    if (state.stale || !campaign?.slideshows.length) campaign = await state.prepare();
    const id = campaign?.slideshows[0]?.id;
    if (id) await startVideoDownload(token, campaignId, id);
  };

  return { ...render, rendering: render.rendering || preparing, generate };
};
