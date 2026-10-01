/** Brand marks for the two platforms Auto Slideshow makes posts for. Hand-written SVG paths. */
const TikTokGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.15 8.15 0 0 0 4.77 1.52V6.75a4.85 4.85 0 0 1-1-.06z" />
  </svg>
);

const InstagramGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

const BADGES = [
  { name: 'TikTok', Glyph: TikTokGlyph, tile: 'bg-black ring-1 ring-white/10' },
  { name: 'Instagram', Glyph: InstagramGlyph, tile: 'bg-[linear-gradient(45deg,#feda75_0%,#fa7e1e_25%,#d62976_50%,#962fbf_75%,#4f5bd5_100%)]' },
] as const;

/** "For TikTok + Instagram" pill above the hero, so visitors know where the posts go. */
export function PlatformBadges() {
  return (
    <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pr-4 pl-1.5 text-sm font-semibold text-ink shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
      {BADGES.map(({ name, Glyph, tile }, index) => (
        <span key={name} className="inline-flex items-center gap-1.5">
          {index > 0 && <span aria-hidden className="mr-0.5 text-muted">+</span>}
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${tile}`}>
            <Glyph />
          </span>
          {name}
        </span>
      ))}
    </p>
  );
}
