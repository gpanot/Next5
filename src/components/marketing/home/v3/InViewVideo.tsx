'use client';

import { useEffect, useRef } from 'react';

/** Muted looping video that only loads and plays while on screen, so six cards never play at once off-screen. */
export function InViewVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) v.play().catch(() => undefined);
      else v.pause();
    }, { threshold: 0.4 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} src={src} poster={poster} aria-label={label} controls playsInline muted loop preload="none" />;
}
