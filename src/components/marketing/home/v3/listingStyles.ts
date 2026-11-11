/** CSS for the "From your Zillow listing" section (ListingVideosSection.tsx). Uses the v3 tokens from styles.ts. */
export const LISTING_CSS = String.raw`
.v3eyebrow{font:700 13px/1 var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--signal);margin-bottom:16px}
.v3lv-grid{display:grid;grid-template-columns:1fr 1.05fr;grid-template-areas:'head videos' 'steps videos';column-gap:56px;align-items:center}
.v3lv-head{grid-area:head;align-self:end}.v3lv-steps{grid-area:steps;align-self:start}.v3lv-videos{grid-area:videos}
.v3lv-note{margin-top:28px;padding:14px 18px;border-radius:16px;background:var(--soft);color:var(--ink);font-size:16px;max-width:30em}
.v3lv-videos{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.v3lv-card{margin:0;display:flex;flex-direction:column;gap:12px}
.v3lv-frame{position:relative;aspect-ratio:9/16;border-radius:24px;overflow:hidden;background:var(--soft);
  box-shadow:0 1px 2px rgba(0,0,0,.06),0 12px 32px rgba(0,0,0,.12)}
.v3lv-frame video{width:100%;height:100%;object-fit:cover}
.v3lv-card figcaption{display:flex;flex-direction:column;gap:2px;font-size:14px;line-height:1.4}
.v3lv-card figcaption b{color:var(--ink);font-size:16px}
@media (max-width:900px){.v3lv-grid{grid-template-columns:1fr;grid-template-areas:'head' 'videos' 'steps';row-gap:32px}}
@media (max-width:520px){.v3lv-videos{gap:12px}.v3lv-frame{border-radius:18px}.v3lv-card figcaption{font-size:13px}}
`;
