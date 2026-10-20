'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createLocalStore } from '../../../lib/localStore';
import { ExpandedPlayback, ExpandIcon, wantsFullscreen } from './ExpandedPlayback';
import { PlayIcon, SLIDE_MS } from './SlidePlayer';

/** Sound on the covers' playback, kept for this browser: on until the user turns it off. */
const soundStore = createLocalStore('next5-cover-sound');

const useCoverSound = (): [boolean, () => void] => {
  const on = soundStore.useValue() !== 'off';
  return [on, () => soundStore.set(on ? 'off' : 'on')];
};

/** The one cover playing on the page: starting one stops the others. `onceId`: that cover stops after one pass. */
let playingId: string | null = null;
let onceId: string | null = null;
let listeners: (() => void)[] = [];
const setPlayingId = (id: string | null, once = false) => {
  playingId = id;
  onceId = once ? id : null;
  listeners.forEach((l) => l());
};

/** Plays cover `id` through its slides once, then back to the cover (the first slideshow after onboarding). */
export const playCoverOnce = (id: string) => setPlayingId(id, true);
const subscribe = (listener: () => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};
const usePlayingId = () => useSyncExternalStore(subscribe, () => playingId, () => null);

/** On a grid cell holding a cover: the cell takes 2×2 tracks while its cover is expanded (desktop). */
export const EXPANDABLE_CELL = 'sm:has-[[data-cover-expanded]]:col-span-2 sm:has-[[data-cover-expanded]]:row-span-2';

const button = 'flex items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 active:scale-95';

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
      {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6M21 9l-5 6" />}
    </svg>
  );
}

/** Steps through the frames while playing (one pass when played once); back to the cover when another cover takes over. */
const useFrames = (id: string, count: number, playing: boolean, othersPlaying: boolean) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const once = onceId === id;
    let shown = 1;
    const timer = setInterval(() => {
      if (once && shown >= count) {
        setIndex(0);
        setPlayingId(null);
        return;
      }
      shown += 1;
      setIndex((i) => (i + 1) % count);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [id, playing, count]);
  const [wasOthers, setWasOthers] = useState(othersPlaying);
  if (othersPlaying !== wasOthers) {
    setWasOthers(othersPlaying);
    if (othersPlaying) setIndex(0);
  }
  return index;
};

type ExpandMode = 'inline' | 'screen' | null;

/** How the cover is expanded; it collapses when another cover starts playing. */
const useExpanded = (othersPlaying: boolean): [ExpandMode, (m: ExpandMode) => void] => {
  const [mode, setMode] = useState<ExpandMode>(null);
  const [wasOthers, setWasOthers] = useState(othersPlaying);
  if (othersPlaying !== wasOthers) {
    setWasOthers(othersPlaying);
    if (othersPlaying) setMode(null);
  }
  return [mode, setMode];
};

type Props = {
  /** Unique on the page, so only one cover plays at a time. */
  id: string;
  /** How many slides; the first is the cover. */
  count: number;
  /** Slide i, filling its 9:16 frame. */
  renderFrame: (i: number) => ReactNode;
  /** Slide i at full size, for the expanded cover (when `renderFrame` draws thumbs). */
  renderFullFrame?: (i: number) => ReactNode;
  audio: { url: string; startAt: number } | null;
  /** The still cover (usually the button that opens the editor), drawn under the playback. */
  children: ReactNode;
};

/**
 * A 9:16 cover that plays its slideshow in place: Play steps through the slides with the music, the sound icon turns
 * the music on or off (remembered for this browser), Expand doubles the cover in its grid (put `EXPANDABLE_CELL` on
 * the cell) or, on phones, goes full screen. Opening the cover stops it.
 */
export function CoverPlayback({ id, count, renderFrame, renderFullFrame, audio, children }: Props) {
  const current = usePlayingId();
  const playing = current === id;
  const index = useFrames(id, count, playing, current !== null && !playing);
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

  const [mode, setMode] = useExpanded(current !== null && !playing);
  const expanded = mode !== null;
  const wrapper = useRef<HTMLDivElement>(null);
  const toggleExpanded = () => {
    if (expanded) return setMode(null);
    setMode(wantsFullscreen() ? 'screen' : 'inline');
    requestAnimationFrame(() => wrapper.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };
  const started = playing || index > 0 || expanded;
  const frameOf = expanded && renderFullFrame ? renderFullFrame : renderFrame;
  const controls = (size: string) => (
    <>
      {audio && (playing || expanded) && (
        <button type="button" onClick={(e) => { e.stopPropagation(); toggleSound(); }} aria-label={soundOn ? 'Sound off' : 'Sound on'} aria-pressed={soundOn} className={`${button} ${size}`}>
          <SoundIcon on={soundOn} />
        </button>
      )}
      {(playing || expanded) && (
        <button type="button" onClick={(e) => { e.stopPropagation(); toggleExpanded(); }} aria-label={expanded ? 'Collapse' : 'Expand'} aria-pressed={expanded} className={`${button} ${size}`}>
          <ExpandIcon expanded={expanded} />
        </button>
      )}
      <button type="button" onClick={(e) => { e.stopPropagation(); setPlayingId(playing ? null : id); }} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing} className={`${button} ${size}`}>
        <PlayIcon playing={playing} size={14} />
      </button>
    </>
  );
  return (
    <div ref={wrapper} data-cover-expanded={mode === 'inline' || undefined} className="relative" onClickCapture={(e) => playing && !(e.target as HTMLElement).closest('[data-cover-controls]') && setPlayingId(null)}>
      {children}
      {started && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className={`absolute inset-0 transition-opacity duration-300 ${i === index ? 'opacity-100' : 'opacity-0'}`}>{frameOf(i)}</div>
          ))}
        </div>
      )}
      <div data-cover-controls className="absolute right-2 bottom-2 flex items-center gap-1.5">{controls('h-8 w-8')}</div>
      {mode === 'screen' && <ExpandedPlayback count={count} index={index} renderFrame={frameOf} controls={controls('h-11 w-11')} onClose={() => setMode(null)} />}
      {audio && (
        <audio ref={sound} src={audio.url} loop muted={!soundOn} preload="none" onLoadedMetadata={(e) => { e.currentTarget.currentTime = audio.startAt; }} />
      )}
    </div>
  );
}
