/** CSS for the "From your Zillow listing" section (ListingVideosSection.tsx). Uses the v3 tokens from styles.ts. */
export const LISTING_CSS = String.raw`
.v3eyebrow{display:flex;align-items:center;gap:8px;font:700 13px/1 var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--signal);margin-bottom:16px}
.v3lv-top{display:grid;grid-template-columns:1.3fr 1fr;column-gap:56px;row-gap:8px;align-items:end}
.v3lv-top .v3mini-steps{margin:0}
.v3lv-note{margin-top:24px;padding:14px 18px;border-radius:16px;background:var(--soft);color:var(--ink);font-size:16px}
.v3lv-videos{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:14px;margin-top:40px}
.v3lv-card{margin:0;display:flex;flex-direction:column;gap:10px;min-width:0}
.v3lv-frame{position:relative;aspect-ratio:9/16;border-radius:20px;overflow:hidden;background:var(--soft);
  box-shadow:0 1px 2px rgba(0,0,0,.06),0 12px 32px rgba(0,0,0,.12)}
.v3lv-frame video{width:100%;height:100%;object-fit:cover}
.v3lv-card figcaption{display:flex;flex-direction:column;gap:2px;font-size:13px;line-height:1.4}
.v3lv-card figcaption b{color:var(--ink);font-size:15px}
.v3lv-more-frame{background:var(--ink);display:flex;align-items:flex-end;padding:16px}
.v3lv-stack{position:absolute;inset:0}
.v3lv-stack span{position:absolute;left:50%;top:14%;width:58%;aspect-ratio:9/16;border-radius:12px;background-size:cover;background-position:center;
  box-shadow:0 10px 24px rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.9);opacity:.9}
.v3lv-stack span:nth-child(1){transform:translateX(-82%) rotate(-12deg)}
.v3lv-stack span:nth-child(2){transform:translateX(-18%) rotate(10deg)}
.v3lv-stack span:nth-child(3){transform:translateX(-50%) translateY(-6%)}
.v3lv-more-frame::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.85) 78%)}
.v3lv-more-frame p{position:relative;z-index:1;margin:0;display:flex;flex-direction:column;color:#fff;line-height:1}
.v3lv-more-frame p b{font-size:44px;font-weight:800;letter-spacing:-.04em;color:#fff}
.v3lv-more-frame p span{font-size:15px;font-weight:600;margin-top:4px;color:rgba(255,255,255,.8)}
.v3lv-more-cap{display:flex;flex-direction:column;gap:2px;font-size:13px;line-height:1.4}
.v3lv-more-cap b{color:var(--ink);font-size:15px}
@media (max-width:1100px){.v3lv-videos{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:900px){.v3lv-top{grid-template-columns:1fr;row-gap:28px}}
@media (max-width:640px){
  .v3lv-videos{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 12px;margin-top:32px}
  .v3lv-frame{border-radius:16px}
  .v3lv-more-frame p b{font-size:38px}
}
`;
