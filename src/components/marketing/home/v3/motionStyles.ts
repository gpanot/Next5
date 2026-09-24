/**
 * Motion layer for homepage v3. Loaded after BASE_CSS so it can override.
 *
 * Rules:
 * - Hero entrance is pure CSS, so it plays on first paint with no JS.
 * - Scroll reveals only hide content once the script adds .v3js to the root,
 *   and the script marks anything already on screen as revealed first. No-JS
 *   visitors and crawlers always see the full page.
 * - Hover lifts use the `translate` property so they never fight the reveal
 *   `transform`.
 * - prefers-reduced-motion turns all of it off.
 */
export const MOTION_CSS = String.raw`
@keyframes v3rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes v3pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
@keyframes v3bump{0%,100%{transform:scale(1)}40%{transform:scale(1.05)}}
@keyframes v3float{0%,100%{translate:0 0}50%{translate:0 -8px}}
@keyframes v3ring{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--signal) 45%,transparent)}100%{box-shadow:0 0 0 14px transparent}}
@keyframes v3sheen{0%{transform:translateX(-120%) skewX(-20deg)}60%,100%{transform:translateX(320%) skewX(-20deg)}}

@media (prefers-reduced-motion: no-preference){html{scroll-behavior:smooth}}
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
.v3nav{transition:box-shadow .3s ease,background-color .3s ease}
.v3nav.scrolled{box-shadow:0 8px 24px -18px rgba(0,0,0,.35)}
.v3nav-links a{transition:color .2s ease}

/* hero entrance */
.v3hero .v3aud,.v3hero h1>span,.v3hero .v3lede,.v3hero .v3linkbox,.v3hero .v3fine,.v3hero .v3stars{animation:v3rise .6s var(--ease-out) both}
.v3hero h1>.l2{animation-delay:.08s}
.v3hero .v3lede{animation-delay:.16s}
.v3hero .v3linkbox{animation-delay:.24s}
.v3hero .v3fine{animation-delay:.32s}
.v3hero .v3stars{animation-delay:.4s}
.v3stage{animation:v3rise .8s var(--ease-out) .2s both}
.v3stage .v3phone{animation:v3float 6s ease-in-out 1.4s infinite}
.v3side-card.done{animation:v3bump .5s var(--ease-out)}
.v3steps-live li.ok .dot{animation:v3pop .35s var(--ease-out)}
.v3hook{transition:opacity .35s ease,transform .35s ease}
.v3hook.swap{opacity:0;transform:translateY(-6px)}
.v3hookdots i{transition:width .35s var(--ease-out),background-color .35s ease}

/* scroll reveal */
.v3js [data-reveal]{opacity:0;transform:translateY(24px);
  transition:opacity .7s var(--ease-out),transform .7s var(--ease-out),translate .3s var(--ease-out),box-shadow .3s ease;
  transition-delay:calc(var(--i,0) * 90ms),calc(var(--i,0) * 90ms),0s,0s}
.v3js [data-reveal].in{opacity:1;transform:none}

/* cards lift on real hover only */
@media (hover:hover){
  .v3pain:hover,.v3way:hover,.v3num:hover{translate:0 -4px;box-shadow:0 22px 40px -28px rgba(0,0,0,.35)}
  .v3way.win:hover{box-shadow:0 30px 60px -30px rgba(0,0,0,.5)}
}

/* section details that play once their card is revealed */
.v3js .v3pain.in .fix{animation:v3rise .5s var(--ease-out) .35s both}
.v3js .v3way.win.in .badge{animation:v3pop .5s var(--ease-out) .45s both}
.v3js .v3mini-steps li.in b{animation:v3pop .45s var(--ease-out) calc(var(--i,0) * 90ms + .15s) both}
.v3js .v3stack .row.bonus.in em{animation:v3pop .45s var(--ease-out) .25s both}
.v3js .v3total s{text-decoration:none;background:linear-gradient(currentColor,currentColor) 0 55%/0% 2px no-repeat;transition:background-size .6s ease .5s}
.v3js .v3total.in s{background-size:100% 2px}
.v3js .v3fit-col.in li{animation:v3rise .45s var(--ease-out) both}
.v3js .v3fit-col.in li:nth-child(2){animation-delay:.08s}
.v3js .v3fit-col.in li:nth-child(3){animation-delay:.16s}

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
  .v3js [data-reveal]{opacity:1;transform:none}
}
`;
