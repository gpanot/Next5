/**
 * Motion layer for homepage v3. Loaded after BASE_CSS so it can override.
 *
 * Rules:
 * - GSAP (src/components/motion) owns the hero intro, the split headings and the
 *   scroll reveals: it is the only thing that animates their opacity/transform.
 *   This file keeps CSS for hover, focus, tap and small details that play once
 *   GSAP adds .in to a revealed block (.motion-on is set on the root while it runs).
 * - No-JS visitors and crawlers always see the full page.
 * - Hover lifts use the `translate` property so they never fight GSAP's `transform`.
 * - prefers-reduced-motion turns all of it off.
 */
export const MOTION_CSS = String.raw`
@keyframes v3rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes v3pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
@keyframes v3bump{0%,100%{transform:scale(1)}40%{transform:scale(1.05)}}
@keyframes v3float{0%,100%{translate:0 0}50%{translate:0 -8px}}
@keyframes v3ring{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--signal) 45%,transparent)}100%{box-shadow:0 0 0 14px transparent}}
@keyframes v3sheen{0%{transform:translateX(-120%) skewX(-20deg)}60%,100%{transform:translateX(320%) skewX(-20deg)}}

#home-v3-root [id]{scroll-margin-top:76px}

/* buttons: press feedback on touch, lift on real hover */
.v3btn{position:relative;overflow:hidden;transition:transform .18s ease,box-shadow .25s ease,opacity .18s ease}
.v3btn:active{transform:scale(.97)}
@media (hover:hover){.v3btn:hover{transform:translateY(-1px);box-shadow:0 12px 24px -12px rgba(0,0,0,.45)}}
.v3btn-signal::after{content:"";position:absolute;top:0;bottom:0;left:0;width:35%;pointer-events:none;transform:translateX(-120%);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);animation:v3sheen 4.5s ease-in-out 2.4s infinite}
.v3aud button{transition:background-color .25s ease,color .25s ease,box-shadow .25s ease}
.v3aud button:active{transform:scale(.96)}
.v3linkbox{transition:box-shadow .25s ease,border-color .25s ease}
/* nav: a full-width bar at the top; once scrolled it turns into a floating glass pill (same space in the flow via a negative bottom margin, so no layout shift) */
.v3nav{display:flow-root;--glass-hi:rgba(255,255,255,.9);transition:background-color .3s ease,border-color .3s ease,backdrop-filter .3s ease}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .v3nav{--glass-hi:rgba(255,255,255,.08)}}
:root[data-theme="dark"] .v3nav{--glass-hi:rgba(255,255,255,.08)}
.v3nav .v3wrap{border:1px solid transparent;border-radius:999px;
  transition:max-width .5s var(--ease-out),height .3s ease,margin .3s ease,padding .5s var(--ease-out),background-color .3s ease,border-color .3s ease,box-shadow .3s ease}
.v3nav.scrolled{background:transparent;border-bottom-color:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}
.v3nav.scrolled .v3wrap{max-width:780px;height:62px;margin:12px auto -10px;padding:0 10px 0 26px;
  background:color-mix(in srgb,var(--paper) 72%,transparent);border-color:color-mix(in srgb,var(--ink) 7%,transparent);
  backdrop-filter:blur(24px) saturate(1.5);-webkit-backdrop-filter:blur(24px) saturate(1.5);
  box-shadow:0 8px 32px rgba(15,23,42,.12),inset 0 1px 1px var(--glass-hi)}
@media (max-width:760px){.v3nav.scrolled .v3wrap{height:56px;margin:8px 12px -6px;padding:0 6px 0 20px}}
.v3nav-links a{transition:color .2s ease}

/* hero: the phone floats with the translate property; GSAP tilts it with transform */
.v3stage .v3phone{animation:v3float 6s ease-in-out 1.4s infinite;transform-style:preserve-3d}
.v3side-card.done{animation:v3bump .5s var(--ease-out)}
.v3steps-live li.ok .dot{animation:v3pop .35s var(--ease-out)}
.v3hook{transition:opacity .35s ease,transform .35s ease}
.v3hook.swap{opacity:0;transform:translateY(-6px)}
.v3hookdots i{transition:width .35s var(--ease-out),background-color .35s ease}

/* revealed blocks: only hover properties transition here, GSAP moves the rest */
[data-reveal]{transition:translate .3s var(--ease-out),box-shadow .3s ease}

/* cards lift on real hover only */
@media (hover:hover){
  .v3pain:hover,.v3way:hover,.v3num:hover{translate:0 -4px;box-shadow:0 22px 40px -28px rgba(0,0,0,.35)}
  .v3way.win:hover{box-shadow:0 30px 60px -30px rgba(0,0,0,.5)}
}

/* section details that play once their card is revealed */
.motion-on .v3pain.in .fix{animation:v3rise .5s var(--ease-out) .35s both}
.motion-on .v3way.win.in .badge{animation:v3pop .5s var(--ease-out) .45s both}
.motion-on .v3mini-steps li.in b{animation:v3pop .45s var(--ease-out) calc(var(--i,0) * 90ms + .15s) both}
.motion-on .v3stack .row.bonus.in em{animation:v3pop .45s var(--ease-out) .25s both}
.motion-on .v3total s{text-decoration:none;background:linear-gradient(currentColor,currentColor) 0 55%/0% 2px no-repeat;transition:background-size .6s ease .5s}
.motion-on .v3total.in s{background-size:100% 2px}
.motion-on .v3fit-col.in li{animation:v3rise .45s var(--ease-out) both}
.motion-on .v3fit-col.in li:nth-child(2){animation-delay:.08s}
.motion-on .v3fit-col.in li:nth-child(3){animation-delay:.16s}

/* guarantee seal: slow orbit on the dashed ring */
.v3seal::before{animation:v3spin 28s linear infinite}

/* swipe deck feedback */
.v3dd-btns span{transition:transform .2s ease}
.v3dd-btns span.hit{transform:scale(1.14)}
.v3dd-yes.hit{animation:v3ring .6s ease-out}

/* FAQ: animated open where supported, rotating plus everywhere */
#home-v3-root{interpolate-size:allow-keywords}
.v3faq summary::after{transition:transform .3s var(--ease-out),color .2s ease}
.v3faq details[open] summary::after{transform:rotate(45deg);color:var(--ink)}
.v3faq details::details-content{block-size:0;overflow:hidden;transition:block-size .35s var(--ease-out),content-visibility .35s allow-discrete}
.v3faq details[open]::details-content{block-size:auto}
.v3faq details[open] p{animation:v3rise .4s var(--ease-out) both}

/* sticky CTA */
.v3sticky-cta.on .v3btn{animation:v3ring 1.2s ease-out .4s}

@media (prefers-reduced-motion: reduce){
  #home-v3-root *,#home-v3-root *::before,#home-v3-root *::after{animation:none!important;transition:none!important}
}
`;
