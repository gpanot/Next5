/**
 * Art-direction layer for homepage v3, loaded after BASE_CSS and MOTION_CSS.
 * Real photos in the phone and swipe deck, the month ribbon, and hero depth.
 */
export const ART_CSS = String.raw`
/* phone-filmed stills (service / seller hero, swipe deck) */
#home-v3-root .v3photo{object-fit:cover;object-position:center 22%;z-index:0}
.v3dd-card.top{background:var(--ink)}
.v3dd-card.top::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(to bottom,rgba(0,0,0,.28),transparent 38%,transparent 70%,rgba(0,0,0,.35))}
.v3dd-hook{z-index:1;top:auto;bottom:22px;left:14px;right:14px;width:auto;
  background:var(--paper);color:var(--ink);font-size:18px;padding:10px 12px;border-radius:12px;letter-spacing:-.02em}

/* hero depth: soft floor shadow under the tilting phone */
.v3stage::after{content:"";position:absolute;left:50%;bottom:6px;width:62%;height:26px;transform:translateX(-50%);
  background:radial-gradient(closest-side,rgba(0,0,0,.18),transparent);filter:blur(6px);pointer-events:none;z-index:-1}
.v3phone{box-shadow:0 40px 80px -40px rgba(0,0,0,.55)}

/* month ribbon */
.v3ribbon{background:var(--ink);color:var(--btn-ink);padding:56px 0 60px;overflow:hidden}
.v3ribbon-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px 24px;margin-bottom:28px}
:where(#home-v3-root) .v3ribbon h2{color:var(--btn-ink);font-size:clamp(26px,3.6vw,38px)}
.v3ribbon-head p{color:color-mix(in srgb,var(--btn-ink) 62%,transparent);font-size:16px}
.v3ribbon-mask{-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.v3ribbon-track{display:flex;width:max-content;will-change:transform}
.v3ribbon-row{display:flex;gap:12px;list-style:none;margin:0;padding:0 12px 0 0}
.v3day{flex:none;display:flex;align-items:center;gap:12px;padding:14px 20px 14px 16px;border-radius:18px;
  border:1px solid color-mix(in srgb,var(--btn-ink) 16%,transparent)}
.v3day b{font-size:34px;font-weight:800;letter-spacing:-.04em;line-height:1;color:var(--btn-ink);font-variant-numeric:tabular-nums}
.v3day span{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:color-mix(in srgb,var(--btn-ink) 70%,transparent);white-space:nowrap}
.v3day i{width:7px;height:7px;border-radius:50%;background:var(--signal)}
.v3day[data-kind="Photo"] i{background:var(--ready)}
.v3day[data-kind="Photo"]{background:color-mix(in srgb,var(--btn-ink) 6%,transparent)}
@media (max-width:760px){.v3ribbon{padding:44px 0 48px}.v3day b{font-size:28px}.v3day{padding:12px 16px 12px 14px}}
`;
