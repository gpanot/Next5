'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpokenWord } from '../../../remotion/types';

/** A card's recorded voiceover: one audio file, how long each shot lasts in it, and each shot's spoken words (timed). */
export type CardNarration = { url: string; durations: number[]; words?: SpokenWord[][] };

/** How far the audio may drift from the shot timer before it is moved back in place. */
const MAX_DRIFT_S = 0.3;

type Options = {
  narration: CardNarration | null | undefined;
  shotIdx: number;
  /** Seconds into the current shot (read when the shot changes). */
  elapsedRef: React.MutableRefObject<number>;
  playing: boolean;
  muted: boolean;
};

/**
 * Plays a card's voiceover in step with its shots: each shot change moves the audio to that shot's line.
 * `waiting`: the card holds its first shot until the audio can play through (a fresh page has nothing cached).
 * `blocked`: the browser refused to start it with sound (no tap yet on this page, e.g. after a refresh on a phone);
 * the card holds too, and `unblock` (called from a tap) starts it.
 */
export function useNarrationAudio({ narration, shotIdx, elapsedRef, playing, muted }: Options) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const url = narration?.url;
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!url) return;
    const audio = new Audio(url);
    audio.preload = 'auto';
    audioRef.current = audio;
    // A broken file counts as loaded: the card plays without it rather than waiting forever.
    const loaded = () => setLoadedUrl(url);
    audio.addEventListener('canplaythrough', loaded);
    audio.addEventListener('error', loaded);
    if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) loaded();
    return () => {
      audio.removeEventListener('canplaythrough', loaded);
      audio.removeEventListener('error', loaded);
      audio.pause();
      audioRef.current = null;
    };
  }, [url]);
  const waiting = Boolean(url) && loadedUrl !== url;
  // Muted, the browser lets it play: nothing to unblock.
  const isBlocked = blocked && !muted;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !narration) return;
    const at = narration.durations.slice(0, shotIdx).reduce((sum, d) => sum + d, 0) + elapsedRef.current;
    if (Math.abs(audio.currentTime - at) > MAX_DRIFT_S) audio.currentTime = at;
  }, [narration, shotIdx, elapsedRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
    if (!playing || waiting || isBlocked) return void audio.pause();
    audio.play().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'NotAllowedError' && !audio.muted) setBlocked(true);
    });
  }, [url, playing, muted, waiting, isBlocked]);

  const unblock = useCallback(() => {
    audioRef.current?.play().catch(() => undefined);
    setBlocked(false);
  }, []);

  return { waiting, blocked: isBlocked, unblock };
}
