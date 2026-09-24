'use client';

import { useEffect, useState } from 'react';
import { clampBlitzDuration } from '../../../config/blitzLab';

/** Duration per URL: seconds, or null when the browser cannot read it. Shared across mounts. */
const cache = new Map<string, number | null>();

const readDuration = (url: string): Promise<number | null> =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const done = (value: number | null) => {
      video.removeAttribute('src');
      video.load();
      resolve(value);
    };
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
    video.onerror = () => done(null);
    video.src = url;
  });

/**
 * Clip length = the shortest video layer (meme and/or background video).
 * A shorter meme gives a shorter clip, so nothing freezes or goes black.
 * Images and audio never set the length. Falls back to `fallbackSeconds`
 * when no video length can be read.
 *
 * Returns `ready: false` while a length is still being read.
 */
export function useClipDuration(videoUrls: string[], fallbackSeconds: number): { seconds: number; ready: boolean } {
  const [, setVersion] = useState(0);
  const key = videoUrls.join('|');

  useEffect(() => {
    let alive = true;
    key.split('|').filter((u) => u && !cache.has(u)).forEach((url) => {
      void readDuration(url).then((d) => {
        cache.set(url, d);
        if (alive) setVersion((v) => v + 1);
      });
    });
    return () => { alive = false; };
  }, [key]);

  const urls = videoUrls.filter(Boolean);
  const ready = urls.every((u) => cache.has(u));
  const known = urls.map((u) => cache.get(u)).filter((d): d is number => typeof d === 'number');
  const seconds = known.length > 0 ? clampBlitzDuration(Math.min(...known)) : fallbackSeconds;
  return { seconds, ready };
}
