'use client';

import { useEffect, useRef } from 'react';
import type { ShotView } from './SwipeCard';

/** A shot's photo: filling the card, or whole over a blurred copy of itself (finished slides keep their framing). */
function ShotImage({ src, fit, onReady }: { src: string; fit: 'cover' | 'contain'; onReady?: () => void }) {
  // A cached picture may be loaded before React listens: checked on mount too. Broken ones count as ready (no stall).
  const ready = { onLoad: onReady, onError: onReady, ref: (el: HTMLImageElement | null) => { if (el?.complete) onReady?.(); } };
  /* eslint-disable @next/next/no-img-element */
  if (fit === 'cover') return <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" draggable={false} {...ready} />;
  return (
    <>
      <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-90" draggable={false} />
      <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-contain" draggable={false} {...ready} />
    </>
  );
  /* eslint-enable @next/next/no-img-element */
}

/** Start of the clip's best window, from the URL's "#t=start,end" (0 without one). */
const startOf = (url: string): number => Number(/#t=([\d.]+)/.exec(url)?.[1] ?? 0) || 0;

type VideoProps = { src: string; active: boolean; muted: boolean; preload: 'auto' | 'metadata'; onReady?: () => void };

/** A shot's clip, loaded ahead and kept mounted: shown, it restarts at its best moment and plays; hidden, it waits. */
function ShotVideo({ src, active, muted, preload, onReady }: VideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!active) return void video.pause();
    video.currentTime = startOf(src);
    void video.play().catch(() => undefined);
  }, [active, src]);
  // Waiting clips rest on their best moment, not on frame 0.
  const toStart = () => {
    const video = ref.current;
    if (video && !active && video.currentTime < startOf(src)) video.currentTime = startOf(src);
  };
  useEffect(() => {
    // Already playable before React listened (cached clip).
    if ((ref.current?.readyState ?? 0) >= HTMLMediaElement.HAVE_FUTURE_DATA) onReady?.();
  }, [onReady]);
  return <video ref={ref} src={src} muted={muted} loop playsInline preload={preload} onLoadedMetadata={toStart} onCanPlay={onReady} onError={onReady} className="absolute inset-0 h-full w-full object-cover" aria-hidden />;
}

type Props = {
  shots: ShotView[];
  /** The shot on screen. */
  index: number;
  /** Load every shot now (the top card and the next one); else only the first. */
  loadAll: boolean;
  /** The top card: plays; the next one only loads. */
  playing: boolean;
  muted: boolean;
  /** Shown under a shot with no media. */
  fallback: (i: number) => string;
  /** The first shot's picture or clip can show (or failed, or has none): the card may start playing. */
  onFirstReady?: () => void;
};

/**
 * Every shot of the card stacked, one visible at a time, so the next shot is already loaded when its turn comes (no
 * black frame while a clip loads). The top card loads all its clips; the next card loads them too, quieter, so a
 * swipe lands on a ready video.
 */
export function ShotLayers({ shots, index, loadAll, playing, muted, fallback, onFirstReady }: Props) {
  const firstHasMedia = Boolean(shots[0]?.mediaUrl);
  useEffect(() => {
    if (!firstHasMedia) onFirstReady?.();
  }, [firstHasMedia, onFirstReady]);
  return (
    <>
      {shots.map((shot, i) => {
        if (!loadAll && i !== 0) return null;
        const visible = i === index;
        const onReady = i === 0 ? onFirstReady : undefined;
        return (
          <div key={`${i}-${shot.mediaUrl ?? ''}`} aria-hidden className={`absolute inset-0 transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {!shot.mediaUrl ? (
              <div className="absolute inset-0" style={{ background: fallback(i) }} />
            ) : shot.mediaKind === 'video' ? (
              <ShotVideo src={shot.mediaUrl} active={visible && playing} muted={muted || !visible} preload={playing || i === 0 ? 'auto' : 'metadata'} onReady={onReady} />
            ) : (
              <ShotImage src={shot.mediaUrl} fit={shot.fit ?? 'cover'} onReady={onReady} />
            )}
          </div>
        );
      })}
    </>
  );
}
