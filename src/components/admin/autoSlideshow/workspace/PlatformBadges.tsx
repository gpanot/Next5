/** Brand marks for the three platforms Auto Slideshow makes posts for. Hand-written SVG paths. */
export const TikTokGlyph = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.15 8.15 0 0 0 4.77 1.52V6.75a4.85 4.85 0 0 1-1-.06z" />
  </svg>
);

export const InstagramGlyph = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const YouTubeGlyph = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8zM10 15V9l5.2 3L10 15z" />
  </svg>
);

const BADGES = [
  { name: 'TikTok', Glyph: TikTokGlyph, tile: 'bg-black ring-1 ring-white/10' },
  { name: 'Instagram', Glyph: InstagramGlyph, tile: 'bg-[linear-gradient(45deg,#feda75_0%,#fa7e1e_25%,#d62976_50%,#962fbf_75%,#4f5bd5_100%)]' },
  { name: 'YouTube', Glyph: YouTubeGlyph, tile: 'bg-[#ff0000]' },
] as const;

/** "For TikTok + Instagram + YouTube" pill above the hero, so visitors know where the posts go. */
export function PlatformBadges() {
  return (
    <p className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-1.5 pr-3 pl-1.5 text-[13px] sm:gap-2 sm:pr-4 sm:text-sm font-semibold text-ink shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
      {BADGES.map(({ name, Glyph, tile }, index) => (
        <span key={name} className="inline-flex items-center gap-1 sm:gap-1.5">
          {index > 0 && <span aria-hidden className="mr-0 text-muted sm:mr-0.5">+</span>}
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${tile}`}>
            <Glyph />
          </span>
          {name}
        </span>
      ))}
    </p>
  );
}
