/**
 * Art-direction layer for homepage v3, loaded after BASE_CSS and MOTION_CSS.
 * Real photos in the phone and hero depth.
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

`;
