'use client';

import { useState } from 'react';

type Props = { src: string; video?: boolean; alt?: string; className?: string };

const PROXY = '/api/admin/blitz/proxy?';

/** A Blitz clip's poster (its first frame as a JPEG, made once on the server), or null for any other video. */
const posterOf = (src: string): string | null => (src.startsWith(PROXY) ? `/api/admin/blitz/poster?${src.slice(PROXY.length)}` : null);

/** The video itself, held on its first frame: muted, never playing, only the start of the file loaded. */
function FirstFrame({ src, alt, className }: { src: string; alt: string; className: string }) {
  return <video src={`${src}#t=0.1`} muted playsInline preload="metadata" aria-label={alt || undefined} className={`pointer-events-none ${className}`} />;
}

/** A Blitz clip's poster image; the video's first frame if the poster cannot be made. */
function VideoPoster({ src, poster, alt, className }: { src: string; poster: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FirstFrame src={src} alt={alt} className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={poster} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />;
}

/**
 * A post's cover: its photo, or a video's first frame. Blitz clips show a poster image the browser keeps, so tiles
 * that mount again (month or view switch, page reload) show at once instead of loading each video again.
 */
export function CoverMedia({ src, video = false, alt = '', className = 'h-full w-full object-cover' }: Props) {
  const poster = video ? posterOf(src) : null;
  if (poster) return <VideoPoster key={src} src={src} poster={poster} alt={alt} className={className} />;
  if (video) return <FirstFrame src={src} alt={alt} className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={className} />;
}
