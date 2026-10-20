'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createLocalStore } from '../../../lib/localStore';
import { PlayIcon, SLIDE_MS } from './SlidePlayer';

/** Sound on the covers' playback, kept for this browser: on until the user turns it off. */
const soundStore = createLocalStore('next5-cover-sound');

const useCoverSound = (): [boolean, () => void] => {
  const on = soundStore.useValue() !== 'off';
  return [on, () => soundStore.set(on ? 'off' : 'on')];
};

/** The one cover playing on the page: starting one stops the others. */
let playingId: string | null = null;
let listeners: (() => void)[] = [];
const setPlayingId = (id: string | null) => {
  playingId = id;
  listeners.forEach((l) => l());
};
const subscribe = (listener: () => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};
const usePlayingId = () => useSyncExternalStore(subscribe, () => playingId, () => null);

const button = 'flex items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 active:scale-95';

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
      {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6M21 9l-5 6" />}
    </svg>
  );
}

/** Steps through the frames while playing; back to the cover when another cover takes over. */
const useFrames = (count: number, playing: boolean, othersPlaying: boolean) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearInterval(timer);
  }, [playing, count]);
  const [wasOthers, setWasOthers] = useState(othersPlaying);
  if (othersPlaying !== wasOthers) {
    setWasOthers(othersPlaying);
    if (othersPlaying) setIndex(0);
  }
  return index;
};

type Props = {
  /** Unique on the page, so only one cover plays at a time. */
  id: string;
  /** How many slides; the first is the cover. */
  count: number;
  /** Slide i, filling its 9:16 frame. */
  renderFrame: (i: number) => ReactNode;
  audio: { url: string; startAt: number } | null;
  /** The still cover (usually the button that opens the editor), drawn under the playback. */
  children: ReactNode;
};

/**
 * A 9:16 cover that plays its slideshow in place: Play steps through the slides with the music, the sound icon turns
 * the music on or off (remembered for this browser). Opening the cover stops it.
 */
export function CoverPlayback({ id, count, renderFrame, audio, children }: Props) {
  const current = usePlayingId();
  const playing = current === id;
  const index = useFrames(count, playing, current !== null && !playing);
  const [soundOn, toggleSound] = useCoverSound();
  const sound = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const a = sound.current;
    if (!a) return;
    if (playing) {
      if (a.paused) void a.play().catch(() => undefined);
    } else {
      a.pause();
      if (current !== null) a.currentTime = audio?.startAt ?? 0;
    }
  }, [playing, current, audio]);

  useEffect(() => () => {
    if (playingId === id) setPlayingId(null);
  }, [id]);

  const started = playing || index > 0;
  return (
    <div className="relative" onClickCapture={(e) => playing && !(e.target as HTMLElement).closest('[data-cover-controls]') && setPlayingId(null)}>
      {children}
      {started && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className={`absolute inset-0 transition-opacity duration-300 ${i === index ? 'opacity-100' : 'opacity-0'}`}>{renderFrame(i)}</div>
          ))}
        </div>
      )}
      <div data-cover-controls className="absolute right-2 bottom-2 flex items-center gap-1.5">
        {audio && playing && (
          <button type="button" onClick={(e) => { e.stopPropagation(); toggleSound(); }} aria-label={soundOn ? 'Sound off' : 'Sound on'} aria-pressed={soundOn} className={`${button} h-8 w-8`}>
            <SoundIcon on={soundOn} />
          </button>
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); setPlayingId(playing ? null : id); }} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing} className={`${button} h-8 w-8`}>
          <PlayIcon playing={playing} size={14} />
        </button>
      </div>
      {audio && (
        <audio ref={sound} src={audio.url} loop muted={!soundOn} preload="none" onLoadedMetadata={(e) => { e.currentTarget.currentTime = audio.startAt; }} />
      )}
    </div>
  );
}
