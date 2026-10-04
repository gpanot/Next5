'use client';

type Props = { src: string; video?: boolean; alt?: string; className?: string };

/**
 * A post's cover: its photo, or a video's first frame (the browser loads only the start of the file and holds still
 * there, muted, never playing).
 */
export function CoverMedia({ src, video = false, alt = '', className = 'h-full w-full object-cover' }: Props) {
  if (video) return <video src={`${src}#t=0.1`} muted playsInline preload="metadata" aria-label={alt || undefined} className={`pointer-events-none ${className}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={className} />;
}
