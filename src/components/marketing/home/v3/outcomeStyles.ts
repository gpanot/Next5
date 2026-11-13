/** CSS for the month calendar (MonthCalendar.tsx) and the Autopilots section (AutopilotSection.tsx). Uses v3 tokens. */
export const OUTCOME_CSS = String.raw`
/* hero: the listing video carries its own captions, so the fact chips leave once it plays */
.v3phone.playing .v3video-ov{opacity:0;transition:opacity .4s ease}

/* month calendar */
.v3cal-sec{background:var(--soft)}
.v3cal-body>.v3wrap{width:100%;display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);grid-template-areas:"head cal" "stats cal";
  column-gap:48px;row-gap:24px;align-content:center;align-items:end}
.v3cal-head{grid-area:head;display:flex;flex-direction:column;align-items:flex-start;gap:20px}
.v3cal-body .v3cal{grid-area:cal;width:100%;max-width:min(100%,calc((100svh - 260px) * 1.38));margin:0 0 0 auto}
.v3cal-body .v3cal-stats{grid-area:stats;align-self:start;margin:0}
.v3cal-head .v3lede{margin-top:12px;max-width:34em}
.v3cal-toggle{display:inline-flex;padding:4px;border-radius:999px;background:var(--paper);border:1px solid var(--line)}
.v3cal-toggle button{border:0;background:transparent;font:600 14px/1 var(--font);color:var(--body);padding:0 16px;min-height:44px;border-radius:999px;cursor:pointer;transition:background .25s ease,color .25s ease}
.v3cal-toggle button[aria-pressed="true"]{background:var(--ink);color:var(--btn-ink)}
.v3cal{background:var(--paper);border:1px solid var(--line);border-radius:24px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 16px 40px -24px rgba(0,0,0,.25)}
.v3cal-title{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px}
.v3cal-title b{font-size:22px;font-weight:800;color:var(--ink);letter-spacing:-.02em}
.v3cal-title span{font-size:14px;font-weight:600;color:var(--mute)}
.v3cal[data-mode="after"] .v3cal-title span{color:var(--ready)}
.v3cal-week,.v3cal-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
.v3cal-week{margin-bottom:8px}
.v3cal-week li{font-size:12px;font-weight:600;color:var(--mute);text-align:center;text-transform:uppercase;letter-spacing:.06em}
.v3cal-day{position:relative;aspect-ratio:1;border-radius:14px;background:var(--soft);border:1px dashed var(--line);overflow:hidden}
.v3cal-n{position:absolute;top:6px;left:8px;z-index:2;font-size:13px;font-weight:700;color:var(--mute);font-variant-numeric:tabular-nums}
.v3cal-post{position:absolute;inset:0;opacity:0;transform:scale(.86);
  transition:opacity .3s ease,transform .4s var(--ease-out)}
.v3cal-post img{object-fit:cover}
.v3cal-post::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35),transparent 30%,transparent 55%,rgba(0,0,0,.72))}
.v3cal-day[data-filled]{border:0}
.v3cal-day[data-filled] .v3cal-post{opacity:1;transform:none}
.v3cal-day[data-filled] .v3cal-n{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.4)}
.v3cal-icon{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--ink);color:#fff;flex:none}
.v3cal-icon svg{width:12px;height:12px}
.v3cal-post .v3cal-icon{position:absolute;top:6px;right:6px;z-index:2}
[data-kind="video"] .v3cal-icon{background:var(--signal)}
[data-kind="market"] .v3cal-icon{background:var(--ready)}
.v3cal-label{position:absolute;left:8px;right:8px;bottom:7px;z-index:2;color:#fff;font-size:12.5px;font-weight:700;line-height:1.15;letter-spacing:-.01em}
.v3cal-day{container-type:inline-size}
.v3cal-mk{position:absolute;inset:0;background:#111;color:#fff;display:flex;flex-direction:column;justify-content:flex-end;gap:3cqi;padding:9cqi}
.v3cal-post:has(.v3cal-mk)::after{display:none}
.v3cal-mk-eye{font-size:7.5cqi;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--signal)}
.v3cal-mk b{font-size:13.5cqi;font-weight:800;line-height:1.02;letter-spacing:-.02em;color:#fff}
.v3cal-mk-week{font-size:8cqi;color:rgba(255,255,255,.72)}
.v3cal-mk-cta{margin-top:4cqi;font-size:7.5cqi;font-weight:700;color:#fff}
@container (max-width:110px){.v3cal-mk-cta{display:none}.v3cal-mk b{font-size:15cqi}}
@container (max-width:72px){.v3cal-mk{padding:8px 5px;justify-content:flex-start}.v3cal-mk-week,.v3cal-mk b{display:none}
  .v3cal-mk-eye{margin-top:14px;font-size:6px;letter-spacing:0;line-height:1.15}}
.v3cal-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.v3cal-legend{list-style:none;display:flex;flex-wrap:wrap;gap:8px 20px;margin:16px 0 0;padding:0}
.v3cal-legend li{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--ink)}
.v3cal-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.v3cal-stats div{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:12px 14px}
.v3cal-stats dt{font-size:13px;line-height:1.25;color:var(--mute)}
.v3cal-stats dd{margin:4px 0 0;font-size:30px;font-weight:800;color:var(--ink);letter-spacing:-.04em;font-variant-numeric:tabular-nums}
@media (max-width:1000px){
  .v3cal-body>.v3wrap{grid-template-columns:minmax(0,1fr);grid-template-areas:"head" "cal" "stats";row-gap:16px}
  .v3cal-head{flex-direction:row;flex-wrap:wrap;align-items:flex-end;justify-content:space-between}
  .v3cal-body .v3cal{margin:0 auto}
}
@media (max-width:640px){
  .v3cal-body>.v3wrap{row-gap:12px}
  .v3cal-head{gap:12px}.v3cal-head .v3lede{margin-top:6px;font-size:16px}
  .v3cal-head h2{font-size:30px}
  .v3cal-title{margin-bottom:8px}.v3cal-title b{font-size:18px}.v3cal-title span{font-size:12px}
  .v3cal-legend{flex-wrap:nowrap;gap:12px;margin-top:10px}.v3cal-legend li{font-size:12px;gap:5px;white-space:nowrap}
  .v3cal-legend .v3cal-icon{width:18px;height:18px}
  .v3cal{padding:12px;border-radius:18px}
  .v3cal-week,.v3cal-grid{gap:4px}
  .v3cal-week li{font-size:10px;letter-spacing:0}
  .v3cal-day{border-radius:8px}
  .v3cal-n{top:3px;left:4px;font-size:10px}
  .v3cal-label{display:none}
  .v3cal-post .v3cal-icon{top:auto;bottom:3px;right:3px;width:16px;height:16px}
  .v3cal-post .v3cal-icon svg{width:9px;height:9px}
  .v3cal-toggle{width:100%}.v3cal-toggle button{flex:1;padding:0 10px;font-size:13px}
  .v3cal-stats{gap:8px}.v3cal-stats div{padding:8px 10px;border-radius:12px}.v3cal-stats dt{font-size:11px}.v3cal-stats dd{font-size:22px;margin-top:2px}
}
@media (prefers-reduced-motion:reduce){.v3cal-post{transition:none}}

/* autopilots */
.v3ap-grid{list-style:none;margin:36px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.v3ap-card{display:flex;flex-direction:column;gap:6px;padding:20px;border-radius:20px;border:1px solid var(--line);background:var(--paper);
  transition:border-color .2s ease,transform .25s var(--ease-out)}
.v3ap-card:hover{border-color:var(--ink);transform:translateY(-2px)}
.v3ap-dot{width:10px;height:10px;border-radius:50%;background:var(--ready);box-shadow:0 0 0 4px var(--ready-bg);margin-bottom:6px}
.v3ap-card b{font-size:19px;color:var(--ink);letter-spacing:-.02em}
.v3ap-what{font-size:16px;color:var(--body);line-height:1.4}
.v3ap-mix{margin-top:auto;padding-top:8px;font-size:13px;font-weight:600;color:var(--mute)}
.v3ap-outcomes{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px}
.v3ap-out{display:flex;align-items:center;gap:16px;padding:20px 22px;border-radius:20px;background:var(--ink);color:var(--btn-ink)}
.v3ap-out b{font-size:52px;font-weight:800;letter-spacing:-.05em;line-height:1;color:var(--btn-ink)}
.v3ap-out span{font-size:15px;line-height:1.35;color:color-mix(in srgb,var(--btn-ink) 78%,transparent)}
.v3ap-promises{list-style:none;margin:24px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:10px 28px}
.v3ap-promises li{display:flex;align-items:center;gap:8px;font-size:15px;color:var(--ink);font-weight:500}
.v3ap-promises svg{color:var(--ready);flex:none}
@media (max-width:900px){.v3ap-grid{grid-template-columns:repeat(2,1fr)}.v3ap-outcomes{grid-template-columns:1fr}}
@media (max-width:520px){.v3ap-grid{grid-template-columns:1fr;gap:10px}.v3ap-card{padding:16px}.v3ap-out b{font-size:42px}
  .v3ap-promises{flex-direction:column}}
`;
