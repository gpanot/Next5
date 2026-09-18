'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UgcVideoDto } from '../../../../types/admin/ugc';
import { EmptyState, usd } from './ui';

type VideoFeedProps = {
  videos: UgcVideoDto[];
  /** Which video to open on, when coming from a card. */
  startId?: string;
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
            void video.play().catch(() => undefined); // autoplay can be refused; the tap-to-play overlay covers it
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

const MODE_LABEL: Record<string, string> = { 'real-person': 'Photo', 'ai-character': 'AI character', imported: 'Imported' };

/**
 * A phone-shaped, snap-scrolling feed of finished videos: the way the clips are actually watched.
 * One clip fills the frame, sound starts off (browsers refuse autoplay with sound), tap toggles play.
 */
export function VideoFeed({ videos, startId }: VideoFeedProps) {
  const playable = videos.filter((v) => v.status === 'ready' && (v.captionedUrl || v.videoUrl));
  const { setRef, refs, current } = useAutoplay(playable.length);
  const [muted, setMuted] = useState(true);
  const [showCaptioned, setShowCaptioned] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const started = useRef(false);

  // Full screen is the closest thing to holding a phone; Escape or the browser can leave it on its own.
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void scrollerRef.current?.requestFullscreen().catch(() => undefined);
  };

  // Open on the clip the user came from, once.
  useEffect(() => {
    if (started.current || !startId) return;
    started.current = true;
    const index = playable.findIndex((v) => v.id === startId);
    if (index > 0) refs.current[index]?.scrollIntoView({ block: 'center' });
  }, [startId, playable, refs]);

  if (playable.length === 0) {
    return <EmptyState title="Nothing to play yet." hint="Finished videos show up here as a phone feed." />;
  }

  const togglePlay = (index: number) => {
    const video = refs.current[index];
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={scrollerRef}
        className={`snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black ${
          fullscreen ? 'h-screen w-screen max-w-none' : 'h-[70vh] max-h-[780px] w-full max-w-[390px] rounded-2xl'
        }`}
      >
        {playable.map((video, index) => {
          const src = (showCaptioned && video.captionedUrl) || video.videoUrl || '';
          return (
            <section key={video.id} className="relative flex h-full w-full snap-start items-center justify-center">
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 to-transparent p-4 pb-5">
                <p className="text-[13px] leading-snug text-white line-clamp-3">{video.script}</p>
                <p className="text-[11px] text-white/70 tabular-nums">
                  {MODE_LABEL[video.mode] ?? video.mode} · {video.durationSec}s · {video.resolution}
                  {' · '}{usd(video.costUsd ?? video.estimatedCostUsd)}
                  {video.captionedUrl ? '' : ' · no captions yet'}
                </p>
              </div>

              <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[11px] text-white tabular-nums">
                {index + 1}/{playable.length}
              </span>
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setMuted((v) => !v)}
          className="inline-flex min-h-10 items-center rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt"
        >
          {muted ? 'Sound on' : 'Sound off'}
        </button>
        <button
          type="button"
          onClick={() => setShowCaptioned((v) => !v)}
          className="inline-flex min-h-10 items-center rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt"
        >
          {showCaptioned ? 'Hide captions' : 'Show captions'}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="inline-flex min-h-10 items-center rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt"
        >
          {fullscreen ? 'Leave full screen' : 'Full screen'}
        </button>
        <p className="text-[12px] text-muted">Scroll or swipe for the next one · tap the video to pause</p>
      </div>
    </div>
  );
}
