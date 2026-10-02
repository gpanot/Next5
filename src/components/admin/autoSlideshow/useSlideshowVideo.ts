'use client';

import { useEffect, useRef, useState } from 'react';
import { adminFetch } from '../business/useAdminApi';

type Video = { projectId: string; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; downloadUrl: string | null; downloadId: string | null };
type Response = { video: Video };

const POLL_MS = 3_000;
/** The worker renders a 30 s slideshow in about a minute; past this something is stuck. */
const GIVE_UP_MS = 6 * 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Saves the MP4: the signed link answers with Content-Disposition: attachment, so the page stays put. */
const save = (url: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.click();
};

/**
 * Makes the slideshow's MP4 with the Blitz Slideshow render, waits for it, then downloads it.
 * The server reuses a finished render while the slides and music are unchanged, so a second tap is instant.
 */
export const useSlideshowVideo = (token: string, runId: string, slideshowId: string) => {
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** When the current tap started (drives the countdown), and how long the last finished one took. */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const alive = useRef(true);
  const base = `/api/admin/auto-slideshow/runs/${runId}/slideshows/${slideshowId}/video`;

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const waitForVideo = async (first: Video): Promise<Video> => {
    let video = first;
    const started = Date.now();
    while (alive.current && (video.status === 'PENDING' || video.status === 'PROCESSING')) {
      if (Date.now() - started > GIVE_UP_MS) throw new Error('The video is taking too long. Try again in a minute.');
      await sleep(POLL_MS);
      const query = new URLSearchParams({ projectId: video.projectId, ...(first.downloadId ? { downloadId: first.downloadId } : {}) });
      video = { ...(await adminFetch<Response>(token, `${base}?${query}`)).video, downloadId: first.downloadId };
    }
    return video;
  };

  const download = async () => {
    const tapped = Date.now();
    setRendering(true);
    setError(null);
    setLastMs(null);
    setStartedAt(tapped);
    try {
      const started = (await adminFetch<Response>(token, base, { method: 'POST', body: '{}' })).video;
      const video = await waitForVideo(started);
      if (!alive.current) return;
      if (video.status === 'FAILED' || !video.downloadUrl) throw new Error('The video failed to render. Try again.');
      save(video.downloadUrl);
      setLastMs(Date.now() - tapped);
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : 'Video download failed');
    } finally {
      if (alive.current) {
        setRendering(false);
        setStartedAt(null);
      }
    }
  };

  return { rendering, error, download, startedAt, lastMs };
};
