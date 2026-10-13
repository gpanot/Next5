'use client';

import { useEffect, useRef } from 'react';

/** A card's recorded voiceover: one audio file, and how long each shot lasts in it. */
export type CardNarration = { url: string; durations: number[] };

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

/** Plays a card's voiceover in step with its shots: each shot change moves the audio to that shot's line. */
export function useNarrationAudio({ narration, shotIdx, elapsedRef, playing, muted }: Options) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const url = narration?.url;

  useEffect(() => {
    if (!url) return;
    const audio = new Audio(url);
    audio.preload = 'auto';
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [url]);

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
    if (playing) audio.play().catch(() => undefined); // blocked until the first tap on some browsers
    else audio.pause();
  }, [url, playing, muted]);
}
