type WatermarkProps = {
  /** 'bottom-right' collides with the "01/05" shot-count badge on the inline
   *  thumbnail, so that view uses 'bottom-left'; the full-screen lightbox has
   *  no such badge and uses the default. */
  position?: 'bottom-right' | 'bottom-left';
};

const positionClasses = {
  'bottom-right': 'bottom-3 right-3',
  'bottom-left': 'bottom-3 left-3',
};

/**
 * Discreet corner mark shown on the free preview shot, before she's paid —
 * a light nudge against casual reposting, not real protection. A screenshot
 * bypasses it trivially, and that's fine; it isn't meant to stop that.
 * Never shown on shots she's actually bought.
 */
export const Watermark = ({ position = 'bottom-right' }: WatermarkProps) => (
  <span
    aria-hidden="true"
    className={`pointer-events-none absolute select-none font-serif font-bold text-[11px] tracking-[0.22em] text-white/70 [text-shadow:0_1px_4px_rgb(0_0_0/0.55)] ${positionClasses[position]}`}
  >
    NEXT5
  </span>
);
