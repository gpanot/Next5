'use client';

import { useSyncExternalStore } from 'react';
import { renderStateOf, startVideoDownload, subscribeRenders } from './videoRenders';

/** One slideshow's MP4 download. It keeps going after the editor closes; reopening shows it still rendering. */
export const useSlideshowVideo = (token: string, runId: string, slideshowId: string) => {
  const state = useSyncExternalStore(subscribeRenders, () => renderStateOf(slideshowId), () => renderStateOf(slideshowId));
  return { ...state, download: () => startVideoDownload(token, runId, slideshowId) };
};
