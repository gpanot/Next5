'use client';

import { adminFetch } from '../business/useAdminApi';

type Video = { projectId: string; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; downloadUrl: string | null; downloadId: string | null };
type Response = { video: Video };

/** One slideshow's MP4 download: `startedAt` drives the countdown, `lastMs` is how long the last finished one took. */
export type RenderState = { rendering: boolean; startedAt: number | null; lastMs: number | null; error: string | null };

const IDLE: RenderState = { rendering: false, startedAt: null, lastMs: null, error: null };

const POLL_MS = 3_000;
/** The worker renders a 30 s slideshow in about a minute; past this something is stuck. */
const GIVE_UP_MS = 6 * 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Video downloads live here, outside React, so closing the slideshow (back to the calendar) does not stop them:
 * the render keeps going and the MP4 still downloads when it is ready.
 */
const states = new Map<string, RenderState>();
const listeners = new Set<() => void>();
let snapshot: RenderState[] = [];

const set = (slideshowId: string, next: RenderState) => {
  states.set(slideshowId, next);
  snapshot = [...states.values()];
  listeners.forEach((l) => l());
};

export const subscribeRenders = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const renderStateOf = (slideshowId: string): RenderState => states.get(slideshowId) ?? IDLE;

/** Every render, for the "making N videos" note; a new array only when something changed. */
export const allRenders = (): RenderState[] => snapshot;

/** Saves the MP4: the signed link answers with Content-Disposition: attachment, so the page stays put. */
const save = (url: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.click();
};

const waitForVideo = async (token: string, base: string, first: Video): Promise<Video> => {
  let video = first;
  const started = Date.now();
  while (video.status === 'PENDING' || video.status === 'PROCESSING') {
    if (Date.now() - started > GIVE_UP_MS) throw new Error('The video is taking too long. Try again in a minute.');
    await sleep(POLL_MS);
    const query = new URLSearchParams({ projectId: video.projectId, ...(first.downloadId ? { downloadId: first.downloadId } : {}) });
    video = { ...(await adminFetch<Response>(token, `${base}?${query}`)).video, downloadId: first.downloadId };
  }
  return video;
};

/**
 * Makes the slideshow's MP4 with the Blitz Slideshow render, waits for it, then downloads it.
 * The server reuses a finished render while the slides and music are unchanged, so a second tap is instant.
 * A second tap while one is rendering does nothing.
 */
export const startVideoDownload = async (token: string, runId: string, slideshowId: string): Promise<void> => {
  if (renderStateOf(slideshowId).rendering) return;
  const tapped = Date.now();
  const base = `/api/admin/auto-slideshow/runs/${runId}/slideshows/${slideshowId}/video`;
  set(slideshowId, { rendering: true, startedAt: tapped, lastMs: null, error: null });
  try {
    const started = (await adminFetch<Response>(token, base, { method: 'POST', body: '{}' })).video;
    const video = await waitForVideo(token, base, started);
    if (video.status === 'FAILED' || !video.downloadUrl) throw new Error('The video failed to render. Try again.');
    save(video.downloadUrl);
    set(slideshowId, { ...IDLE, lastMs: Date.now() - tapped });
  } catch (err) {
    set(slideshowId, { ...IDLE, error: err instanceof Error ? err.message : 'Video download failed' });
  }
};
