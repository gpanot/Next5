'use client';

import { useEffect, useRef } from 'react';

/** A silent looping animation that plays only on screen. With reduced motion, it stays on its poster. */
export function BlueprintVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.4 });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      className="aspect-[4/5] w-full rounded-xl bg-zinc-900 object-cover shadow-sm"
    />
  );
}
