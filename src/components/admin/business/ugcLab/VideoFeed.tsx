'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UgcVideoDto } from '../../../../types/admin/ugc';
import { usd } from './ui';

type VideoFeedProps = {
  videos: UgcVideoDto[];
  /** Which video to open on, when coming from a card. */
  startId?: string;
  /** Leaves the feed and goes back to the library. */
  onClose: () => void;
};

/** Plays whichever clip fills most of the viewport, and pauses the rest — like a phone feed. */
const useAutoplay = (count: number) => {
  const refs = useRef<(HTMLVideoElement | null)[]>([]);
  const [current, setCurrent] = useState(0);

  const setRef = useCallback((index: number) => (el: HTMLVideoElement | null) => {
    refs.current[index] = el;
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          const index = refs.current.indexOf(video);
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            setCurrent(index);
            void video.play().catch(() => undefined); // autoplay can be refused; tapping the clip plays it
          } else {
            video.pause();
          }
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    for (const video of refs.current) if (video) observer.observe(video);
    return () => observer.disconnect();
  }, [count]);

  return { setRef, refs, current };
};

/**
 * Takes over the screen while the feed is open: browser full screen where it exists (desktop, Android),
 * and a fixed overlay everywhere else — iOS Safari has no full screen for elements, only for videos.
 */
const useTakeOverScreen = (target: React.RefObject<HTMLDivElement | null>, onClose: () => void) => {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const element = target.current;
    let entered = false;
    void element?.requestFullscreen?.().then(() => {
      entered = true;
    }).catch(() => undefined);

    // Leaving full screen (Escape, or the browser's own control) means leaving the feed.
    const onFullscreenChange = () => {
      if (entered && !document.fullscreenElement) closeRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) closeRef.current();
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown);

    // The page behind must not scroll under the feed.
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = bodyOverflow;
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [target]);
};

const MODE_LABEL: Record<string, string> = { 'real-person': 'Photo', 'ai-character': 'AI character', imported: 'Imported' };

const overlayButton =
  'inline-flex min-h-10 items-center rounded-full bg-black/55 px-3 py-1.5 text-[12px] text-white backdrop-blur transition-colors hover:bg-black/75';

/**
 * A full-screen, snap-scrolling feed of finished videos: the way the clips are actually watched.
 * One clip fills the screen, sound starts off (browsers refuse autoplay with sound), tap toggles play.
 */
export function VideoFeed({ videos, startId, onClose }: VideoFeedProps) {
  const playable = videos.filter((v) => v.status === 'ready' && (v.captionedUrl || v.videoUrl));
  const { setRef, refs, current } = useAutoplay(playable.length);
  const [muted, setMuted] = useState(true);
  const [showCaptioned, setShowCaptioned] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useTakeOverScreen(scrollerRef, onClose);

  // Open on the clip the user came from, once.
  useEffect(() => {
    if (started.current || !startId) return;
    started.current = true;
    const index = playable.findIndex((v) => v.id === startId);
    if (index > 0) refs.current[index]?.scrollIntoView({ block: 'center' });
  }, [startId, playable, refs]);

  const togglePlay = (index: number) => {
    const video = refs.current[index];
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  };

  return (
    <div
      ref={scrollerRef}
      className="fixed inset-0 z-50 h-[100dvh] w-screen snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black"
    >
      {playable.length === 0 && (
        <section className="flex h-[100dvh] w-full flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-[14px] text-white">Nothing to play yet.</p>
          <p className="text-[12px] text-white/70">Finished videos show up here as a phone feed.</p>
          <button type="button" onClick={onClose} className={overlayButton}>Back to the library</button>
        </section>
      )}

      {playable.map((video, index) => {
        const src = (showCaptioned && video.captionedUrl) || video.videoUrl || '';
        return (
          <section key={video.id} className="relative flex h-[100dvh] w-full snap-start items-center justify-center">
            <video
              ref={setRef(index)}
              key={src}
              src={src}
              muted={muted}
              loop
              playsInline
              preload={Math.abs(index - current) <= 1 ? 'auto' : 'none'}
              className="h-full w-full object-contain"
              onClick={() => togglePlay(index)}
            />

            {/* Caption-style overlay, like the real app */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 to-transparent p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <p className="line-clamp-2 text-[13px] leading-snug text-white">{video.script}</p>
              <p className="text-[11px] text-white/70 tabular-nums">
                {MODE_LABEL[video.mode] ?? video.mode} · {video.durationSec}s · {video.resolution}
                {' · '}{usd(video.costUsd ?? video.estimatedCostUsd)}
                {video.captionedUrl ? '' : ' · no captions yet'}
              </p>
            </div>
          </section>
        );
      })}

      {/* Controls float over the feed, out of the way of the burned captions. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} className={`pointer-events-auto ${overlayButton}`} aria-label="Close the feed">
          ✕ Close
        </button>
        <div className="pointer-events-auto flex items-center gap-2">
          <button type="button" onClick={() => setMuted((v) => !v)} className={overlayButton}>
            {muted ? 'Sound on' : 'Sound off'}
          </button>
          <button type="button" onClick={() => setShowCaptioned((v) => !v)} className={overlayButton}>
            {showCaptioned ? 'Hide captions' : 'Show captions'}
          </button>
          {playable.length > 0 && (
            <span className="rounded-full bg-black/55 px-2 py-1 text-[11px] text-white tabular-nums backdrop-blur">
              {current + 1}/{playable.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
