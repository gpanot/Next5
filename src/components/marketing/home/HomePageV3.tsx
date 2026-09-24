/**
 * Next5 Homepage v3
 * Source of truth: new website/next5-homepage-v3-final.html
 * This is a server component — no 'use client'. Audience is server-read from ?for= URL param.
 * Interactivity (audience toggle, demo animation, forms) is handled by inline vanilla JS.
 */
import Script from 'next/script';

export type Audience = 'realtor' | 'service' | 'seller';

// ---------------------------------------------------------------------------
// CSS — copied verbatim from the reference HTML. Single change: body[data-aud]
// selector moved to [data-aud] (attribute now lives on #home-v3-root, not body,
// so SSR renders with the correct audience class immediately).
// Using String.raw to avoid JS escape-sequence processing (preserves \2212 etc.)
// ---------------------------------------------------------------------------
const CSS = String.raw`
:root{
  --paper:#FFFFFF;
  --ink:#000000;
  --body:#4A4B50;
  --mute:#7C7D82;
  --line:#E8E5E1;
  --soft:#F5F3F0;
  --soft-2:#ECE8E3;
  --signal:#E5402A;
  --ready:#1E8049;
  --ready-bg:#E4F3EA;
  --making:#9A6212;
  --making-bg:#FBF0DC;
  --btn-ink:#FFFFFF;
  --font:"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif;
  box-sizing:border-box;
  padding-top:env(safe-area-inset-top,0px);
  padding-bottom:env(safe-area-inset-bottom,0px);
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --paper:#141416;--ink:#FFFFFF;--body:#C4C4C8;--mute:#909096;--line:#2C2C30;
    --soft:#1E1E21;--soft-2:#28282C;--signal:#FF5A40;--ready:#6FD39A;--ready-bg:#16301F;
    --making:#F0B75E;--making-bg:#33260F;--btn-ink:#000000;
  }
}
:root[data-theme="dark"]{
  --paper:#141416;--ink:#FFFFFF;--body:#C4C4C8;--mute:#909096;--line:#2C2C30;
  --soft:#1E1E21;--soft-2:#28282C;--signal:#FF5A40;--ready:#6FD39A;--ready-bg:#16301F;
  --making:#F0B75E;--making-bg:#33260F;--btn-ink:#000000;
}
#home-v3-root *,#home-v3-root *::before,#home-v3-root *::after{box-sizing:border-box}
#home-v3-root{background:var(--paper);color:var(--body);font-family:var(--font);font-size:17px;line-height:1.55}
#home-v3-root img,#home-v3-root video{max-width:100%;display:block}
#home-v3-root a{color:inherit}
#home-v3-root h1,#home-v3-root h2,#home-v3-root h3{color:var(--ink);margin:0;font-weight:800;letter-spacing:-0.035em;line-height:1.02}
#home-v3-root h2{font-size:clamp(32px,5.2vw,52px)}
#home-v3-root h3{font-size:21px;letter-spacing:-0.02em;line-height:1.2;font-weight:700}
#home-v3-root p{margin:0}
#home-v3-root :focus-visible{outline:3px solid var(--signal);outline-offset:3px;border-radius:6px}
.v3wrap{max-width:1160px;margin:0 auto;padding:0 20px}
.v3lede{font-size:19px;max-width:34em;margin-top:18px}
.v3section{padding:96px 0;border-top:1px solid var(--line)}
.v3section-head{max-width:640px;margin-bottom:48px}

/* buttons */
.v3btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:52px;padding:0 24px;border-radius:999px;border:0;
  background:var(--ink);color:var(--btn-ink);font:600 16px/1 var(--font);cursor:pointer;text-decoration:none;white-space:nowrap}
.v3btn:hover{opacity:.88}
.v3btn-sm{height:38px;padding:0 16px;font-size:14px}
.v3btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}

/* nav */
.v3nav{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:color-mix(in srgb,var(--paper) 88%,transparent);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.v3nav .v3wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
.v3logo{font-weight:800;letter-spacing:.14em;color:var(--ink);text-decoration:none;font-size:17px}
.v3logo span{color:var(--signal)}
.v3nav-links{display:flex;gap:28px;font-size:15px}
.v3nav-links a{text-decoration:none;color:var(--body)}
.v3nav-links a:hover{color:var(--ink)}
.v3nav-right{display:flex;gap:10px;align-items:center}
.v3nav-right .v3login{font-size:15px;text-decoration:none;padding:0 8px}
@media (max-width:820px){.v3nav-links,.v3nav-right .v3login{display:none}}

/* placeholder media */
.v3ph{position:relative;background:var(--soft);overflow:hidden;
  background-image:repeating-linear-gradient(135deg,transparent 0 14px,color-mix(in srgb,var(--soft-2) 70%,transparent) 14px 15px)}
.v3ph-label{position:absolute;left:10px;bottom:10px;right:10px;display:flex;align-items:center;gap:6px;
  font-size:11.5px;font-weight:500;color:var(--mute);line-height:1.25}
.v3ph-label svg{flex:none}
.v3ph[data-kind="video"]::after{content:"";position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
  background:color-mix(in srgb,var(--paper) 85%,transparent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 7l9 5-9 5z' fill='%23777'/%3E%3C/svg%3E") center/22px no-repeat}

/* phone frame */
.v3phone{position:relative;width:100%;max-width:300px;aspect-ratio:9/19.2;border-radius:42px;background:var(--ink);padding:10px;
  box-shadow:0 30px 60px -30px rgba(0,0,0,.45)}
.v3phone-screen{position:relative;width:100%;height:100%;border-radius:33px;overflow:hidden;background:var(--soft)}
.v3phone-notch{position:absolute;top:18px;left:50%;transform:translateX(-50%);width:84px;height:24px;border-radius:14px;background:var(--ink);z-index:3}

/* HERO */
.v3hero{padding:56px 0 88px}
.v3hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:56px;align-items:center}
@media (max-width:900px){.v3hero-grid{grid-template-columns:1fr;gap:48px}}
.v3aud{display:inline-flex;padding:4px;border-radius:999px;background:var(--soft);margin-bottom:28px}
.v3aud button{border:0;background:transparent;font:600 14px/1 var(--font);color:var(--body);padding:10px 16px;border-radius:999px;cursor:pointer}
.v3aud button[aria-pressed="true"]{background:var(--paper);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.v3hero h1{font-size:clamp(40px,6.4vw,74px)}
.v3hero h1 .l2{display:block;color:var(--signal);font-weight:800}
.v3linkbox{margin-top:32px;display:flex;gap:8px;padding:8px;border-radius:999px;border:1.5px solid var(--ink);background:var(--paper);max-width:560px}
.v3linkbox label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.v3linkbox input{flex:1;min-width:0;border:0;background:transparent;font:500 16px var(--font);color:var(--ink);padding:0 14px}
.v3linkbox input:focus{outline:none}
.v3linkbox:focus-within{box-shadow:0 0 0 4px color-mix(in srgb,var(--signal) 22%,transparent)}
@media (max-width:520px){
  .v3linkbox{flex-direction:column;border-radius:22px;padding:10px}
  .v3linkbox input{height:44px}
  .v3linkbox .v3btn{width:100%}
}
.v3fine{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:16px;font-size:14px;color:var(--mute)}
.v3fine span{display:inline-flex;align-items:center;gap:6px}
.v3fine svg{color:var(--ready)}

.v3stage{position:relative;display:flex;justify-content:center;padding:10px 0 30px}
.v3stage .v3phone{max-width:290px}
.v3build{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;justify-content:center;padding:28px 22px;background:var(--paper);transition:opacity .5s ease}
.v3build.done{opacity:0;pointer-events:none}
.v3build h4{margin:0 0 18px;font-size:15px;color:var(--ink);font-weight:700}
.v3steps-live{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.v3steps-live li{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--mute)}
.v3steps-live li .dot{width:18px;height:18px;border-radius:50%;border:2px solid var(--line);flex:none;position:relative}
.v3steps-live li.on{color:var(--ink)}
.v3steps-live li.on .dot{border-color:var(--signal);border-right-color:transparent;animation:v3spin .8s linear infinite}
.v3steps-live li.ok{color:var(--ink)}
.v3steps-live li.ok .dot{border-color:var(--ready);background:var(--ready)}
.v3steps-live li.ok .dot::after{content:"";position:absolute;left:4px;top:1px;width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
@keyframes v3spin{to{transform:rotate(360deg)}}
.v3thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:22px}
.v3thumbs div{aspect-ratio:1;border-radius:6px;background:var(--soft);opacity:0;transform:scale(.9);transition:all .3s ease}
.v3thumbs div.in{opacity:1;transform:none}
.v3video-ov{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;justify-content:space-between;padding:58px 16px 20px;pointer-events:none}
.v3hook{align-self:center;text-align:center;background:var(--paper);color:var(--ink);font-weight:800;font-size:19px;line-height:1.15;padding:8px 12px;border-radius:10px;max-width:92%;letter-spacing:-.02em}
.v3facts{display:flex;gap:6px;flex-wrap:wrap}
.v3facts span{background:rgba(0,0,0,.72);color:#fff;font-size:12px;font-weight:600;padding:5px 9px;border-radius:8px}
.v3hookdots{display:flex;justify-content:center;gap:6px;margin-top:10px}
.v3hookdots i{width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,.25)}
.v3hookdots i.on{background:var(--signal);width:18px;border-radius:4px}
.v3side-card{position:absolute;right:0;bottom:6px;background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:12px 14px;
  width:210px;box-shadow:0 14px 30px -18px rgba(0,0,0,.35);font-size:13px}
.v3side-card b{color:var(--ink);display:block;font-size:13.5px;margin-bottom:2px}
.v3timer .big-n{font-size:38px;font-weight:800;color:var(--ready);letter-spacing:-.04em;line-height:1.1;margin:2px 0}
@media (max-width:900px){.v3side-card{position:static;margin:18px auto 0;width:100%;max-width:290px}.v3stage{flex-direction:column;align-items:center}}

/* PAINS */
.v3pains{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media (max-width:860px){.v3pains{grid-template-columns:1fr}}
.v3pain{border:1px solid var(--line);border-radius:24px;padding:26px;display:flex;flex-direction:column}
.v3pain .x{width:34px;height:34px;border-radius:50%;background:var(--soft);color:var(--signal);display:grid;place-items:center;margin-bottom:16px}
.v3pain p{margin-top:8px;flex:1}
.v3pain .fix{margin-top:18px;padding-top:16px;border-top:1px solid var(--line);color:var(--ready);font-weight:600;display:flex;gap:8px;align-items:center}

/* WAYS */
.v3ways{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:stretch}
@media (max-width:860px){.v3ways{grid-template-columns:1fr}}
.v3way{border:1px solid var(--line);border-radius:24px;padding:28px;position:relative}
.v3way.win{border:2px solid var(--ink);background:var(--paper);box-shadow:0 24px 50px -30px rgba(0,0,0,.45)}
.v3way .badge{position:absolute;top:-13px;left:24px;background:var(--signal);color:#fff;font-weight:700;font-size:13px;padding:4px 12px;border-radius:999px}
.v3way-t{font-weight:600;color:var(--ink)}
.v3way-p{font-size:44px;font-weight:800;color:var(--ink);letter-spacing:-.04em;margin:6px 0 14px}
.v3way-p small{font-size:16px;color:var(--mute);font-weight:500;letter-spacing:0}
.v3way ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.v3way:not(.win) li{color:var(--mute);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--mute) 50%,transparent)}
.v3way.win li{color:var(--ink);font-weight:500}
.v3note{margin-top:16px;font-size:13px;color:var(--mute)}

/* SWIPE */
.v3swipe-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
@media (max-width:860px){.v3swipe-grid{grid-template-columns:1fr}}
.v3mini-steps{list-style:none;padding:0;margin:28px 0 0;display:grid;gap:14px}
.v3mini-steps li{display:flex;gap:14px;align-items:center;font-size:18px;color:var(--ink);font-weight:500}
.v3mini-steps b{width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--btn-ink);display:grid;place-items:center;font-size:15px;flex:none}
.v3deck-demo{max-width:320px;margin:0 auto;width:100%}
.v3dd-day{font-weight:800;font-size:22px;color:var(--ink);margin-bottom:10px;letter-spacing:-.02em}
.v3dd-day span{font-weight:500;font-size:14px;color:var(--mute)}
.v3dd-stack{position:relative;aspect-ratio:9/14}
.v3dd-card{position:absolute;inset:0;border-radius:24px;overflow:hidden;background:var(--soft)}
.v3dd-card.b1{transform:translateY(10px) scale(.95);background:var(--soft-2)}
.v3dd-card.b2{transform:translateY(20px) scale(.9);background:var(--line)}
.v3dd-card.top{box-shadow:0 20px 40px -24px rgba(0,0,0,.5)}
.v3dd-hook{position:absolute;left:16px;right:16px;top:22%;text-align:center;font-weight:800;font-size:21px;color:var(--ink);line-height:1.15}
.v3dd-btns{display:flex;justify-content:center;gap:22px;margin-top:30px}
.v3dd-btns span{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line);background:var(--paper)}
.v3dd-no{color:#666}
.v3dd-yes{background:var(--ready)!important;color:#fff;border-color:var(--ready)!important}

/* OFFER STACK */
.v3offer-sec{background:var(--soft)}
.v3stack{max-width:760px;margin:0 auto;background:var(--paper);border-radius:28px;padding:10px 28px 28px;box-shadow:0 30px 60px -40px rgba(0,0,0,.4)}
.v3stack .row{display:flex;justify-content:space-between;gap:18px;padding:18px 0;border-bottom:1px solid var(--line);font-size:16.5px;align-items:center}
.v3stack .row>span:first-child{display:flex;gap:10px;align-items:flex-start}
.v3stack .row svg{color:var(--ready);flex:none;margin-top:5px}
.v3stack .row b{color:var(--ink);font-weight:700}
.v3stack .val{font-weight:700;color:var(--ink);white-space:nowrap}
.v3stack .bonus em{font-style:normal;background:var(--signal);color:#fff;font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:6px;margin-right:4px;flex:none;margin-top:2px}
.v3stack .bonus b{margin-right:4px}
.v3total{display:flex;justify-content:space-between;padding:20px 0 6px;font-size:18px;font-weight:600;color:var(--ink)}
.v3total s{font-weight:800}
.v3price-row{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-top:12px;padding-top:20px;border-top:2px solid var(--ink)}
.v3today{font-size:14px;font-weight:600;color:var(--signal)}
.v3price-big{font-size:60px;font-weight:800;color:var(--ink);letter-spacing:-.05em;line-height:1}
.v3price-big small{font-size:18px;color:var(--mute);font-weight:500;letter-spacing:0}
.v3per{font-size:14px;color:var(--mute);margin-top:6px}
.v3vnote{margin:16px 0 0;font-size:12.5px;color:var(--mute)}

/* GUARANTEE */
.v3guar3{display:grid;grid-template-columns:auto 1fr;gap:48px;align-items:center;background:var(--ink);color:color-mix(in srgb,var(--btn-ink) 78%,transparent);border-radius:36px;padding:56px}
.v3guar3 h2{color:var(--btn-ink)}
@media (max-width:760px){.v3guar3{grid-template-columns:1fr;padding:36px 24px;gap:28px}}
.v3seal{width:150px;height:150px;border-radius:50%;border:3px dashed var(--signal);display:grid;place-items:center;text-align:center;color:var(--btn-ink)}
.v3seal div{font-size:52px;font-weight:800;line-height:.9;letter-spacing:-.04em}
.v3seal small{display:block;font-size:14px;letter-spacing:.2em;font-weight:700;color:var(--signal);margin-top:6px}
.v3g-mini{display:grid;gap:10px;margin-top:24px}
.v3g-mini div{display:flex;gap:10px;align-items:flex-start}
.v3g-mini svg{color:#6FD39A;flex:none;margin-top:5px}
.v3g-mini b{color:var(--btn-ink)}

/* NUMBERS */
.v3nums{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media (max-width:860px){.v3nums{grid-template-columns:1fr}}
.v3num{border:1px solid var(--line);border-radius:24px;padding:28px;display:flex;flex-direction:column}
.v3num .n{font-size:clamp(48px,6vw,68px);font-weight:800;letter-spacing:-.05em;color:var(--ink);line-height:1}
.v3num p{margin:12px 0 16px;font-size:16.5px;color:var(--ink);flex:1}
.v3src{font-size:12px;color:var(--mute)}

/* FIT */
.v3fit{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media (max-width:760px){.v3fit{grid-template-columns:1fr}}
.v3fit-col{border-radius:24px;padding:28px}
.v3fit-col.yes{background:var(--ready-bg)}
.v3fit-col.no{border:1px solid var(--line)}
.v3fit-col ul{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:12px}
.v3fit-col li{display:flex;gap:10px;font-size:16.5px;color:var(--ink)}
.v3fit-col li svg{flex:none;margin-top:5px}
.v3fit-col.yes svg{color:var(--ready)}
.v3fit-col.no svg{color:var(--signal)}

/* FAQ */
.v3faq{max-width:760px}
.v3faq details{border-top:1px solid var(--line);padding:4px 0}
.v3faq details:last-child{border-bottom:1px solid var(--line)}
.v3faq summary{list-style:none;cursor:pointer;padding:18px 0;color:var(--ink);font-weight:600;font-size:18px;display:flex;justify-content:space-between;gap:20px}
.v3faq summary::-webkit-details-marker{display:none}
.v3faq summary::after{content:"+";font-weight:400;font-size:24px;line-height:1;color:var(--mute)}
.v3faq details[open] summary::after{content:"\2212"}
.v3faq details p{padding:0 0 20px;max-width:40em}

/* FINAL */
.v3final{padding:0 0 96px}
.v3final-box{background:var(--ink);border-radius:36px;padding:64px 40px;color:color-mix(in srgb,var(--btn-ink) 75%,transparent)}
.v3final-box h2{color:var(--btn-ink);max-width:14em}
.v3final-box .v3linkbox{border-color:var(--btn-ink);background:var(--btn-ink)}
.v3final-box .v3linkbox input{color:var(--ink)}
.v3final-box .v3linkbox .v3btn{background:var(--signal);color:#fff}
@media (max-width:600px){.v3final-box{padding:44px 22px;border-radius:28px}}
.v3two{display:grid;gap:10px;margin:22px 0 8px;font-size:18px}
.v3two b{color:var(--btn-ink)}
.v3fine-w{margin-top:14px;font-size:14px}

/* FOOTER */
.v3footer{border-top:1px solid var(--line);padding:40px 0 56px;font-size:14px;color:var(--mute)}
.v3footer .v3wrap{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}
.v3footer nav{display:flex;gap:22px;flex-wrap:wrap}
.v3footer a{text-decoration:none}

/* STICKY CTA */
.v3sticky-cta{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:30;transform:translateY(150%);transition:transform .25s ease;display:none}
.v3sticky-cta .v3btn{width:100%;height:54px;box-shadow:0 14px 30px -12px rgba(0,0,0,.5)}
.v3sticky-cta.on{transform:none}
@media (max-width:760px){.v3sticky-cta{display:block}}

/* PROMO BAR */
.v3promo{background:var(--ink);color:var(--btn-ink);text-align:center;font-size:14px;padding:9px 16px}
.v3promo a{color:var(--btn-ink);font-weight:700;margin-left:6px}

/* SHARED UTILS */
.v3btn-signal{background:var(--signal);color:#fff}
.v3btn-lg{height:60px;padding:0 30px;font-size:17px}
.v3stars{margin-top:22px;font-size:14.5px;color:var(--body);display:flex;gap:8px;align-items:flex-start;flex-direction:column;max-width:470px}
.v3stars b{color:var(--ink)}
.v3stat-pill b{font-size:17px;color:var(--signal)}
.v3muted{color:var(--mute)}
.v3center{margin-left:auto;margin-right:auto;text-align:center}
.v3center .v3lede{margin-left:auto;margin-right:auto}

/* AUDIENCE VISIBILITY — key rule: uses root div data-aud, not body */
[data-aud="realtor"] [data-only]:not([data-only~="realtor"]),
[data-aud="service"] [data-only]:not([data-only~="service"]),
[data-aud="seller"] [data-only]:not([data-only~="seller"]){display:none!important}

@media (max-width:420px){.v3aud{display:flex;width:100%}.v3aud button{flex:1;padding:10px 6px;font-size:13px}}

@media (prefers-reduced-motion: reduce){
  #home-v3-root *{animation:none!important;transition:none!important}
}
`;

// ---------------------------------------------------------------------------
// JS — adapted from the reference HTML.
// Changes vs original:
//   1. Reads ?for= URL param and sets initial audience
//   2. data-aud is set on #home-v3-root div (not document.body) for SSR safety
//   3. history.replaceState updates URL on audience toggle
//   4. All class names updated to match v3 prefixed classes above
// ---------------------------------------------------------------------------
const JS = `(function(){
  var copy={
    realtor:{h1:"Every listing, turned into a month of videos.",sub:"Paste your Zillow link. In 2 minutes you're watching your first video. Your whole month is planned before you finish your coffee.",
      ph:"zillow.com/homedetails/...",demo:"https://www.zillow.com/homedetails/1204-Oak-Ridge-Dr-Austin-TX",hook:"Wait till you see the kitchen.",facts:["$649,000","3 bd","2 ba","Austin, TX"],
      s0:"Pulling your 24 listing photos",label:"Video: listing slideshow, 9:16",noun:"listing",photos:"photos of you",stat:"<b>39%<\\/b> of realtors say social media brings their best leads, more than any other tool.",src:"NAR Technology Survey, 2025",
      pain1:"Showings, calls, paperwork. Posting is always tomorrow.",fit1:"You have listings and want more people to see them",dd:"You're gonna fall in love with this one."},
    service:{h1:"Every job, turned into a month of videos.",sub:"Paste your website. In 2 minutes you're watching your first video. Your whole month is planned before your next service call.",
      ph:"yourbusiness.com",demo:"https://www.brightlineelectric.com",hook:"3 signs your panel needs an upgrade.",facts:["Licensed and insured","Same-day service","Austin, TX"],
      s0:"Reading your website and job photos",label:"Video: tip video over your job photos, 9:16",noun:"job",photos:"photos of your team and work",stat:"<b>40%<\\/b> of millennial homeowners use social media to find roofing contractors.",src:"Roofing Contractor homeowner survey, 2025",
      pain1:"You're on a roof, under a sink or in a crawlspace. Posting is always tomorrow.",fit1:"You do great work and want more people to see it",dd:"Don't ignore this noise from your AC."},
    seller:{h1:"Every product, turned into a month of videos.",sub:"Paste your TikTok Shop link. In 2 minutes you're watching your first video. Your whole month is planned before your next restock.",
      ph:"shop.tiktok.com/view/product/...",demo:"https://shop.tiktok.com/view/product/linen-midi-dress",hook:"The dress everyone keeps asking about.",facts:["$38","1,240 sold","4 colors"],
      s0:"Pulling your 8 product photos",label:"Video: product video, 9:16",noun:"product",photos:"try-on photos on a model",stat:"<b>215,000+<\\/b> US small businesses sell on TikTok Shop. Standing out takes volume.",src:"TikTok Shop via Modern Retail, 2026",
      pain1:"Sourcing, packing, shipping. Posting is always tomorrow.",fit1:"You have products that deserve more views",dd:"1,240 sold. Here's why."}
  };
  var q=function(s){return document.querySelector(s)};
  var root=document.getElementById("home-v3-root");
  var timers=[],reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Read URL param
  var urlAud=(new URLSearchParams(location.search).get("for")||"").toLowerCase();
  var current=["realtor","service","seller"].indexOf(urlAud)>-1?urlAud:"realtor";

  function setAud(a){
    current=a;var c=copy[a];
    if(root) root.setAttribute("data-aud",a);
    history.replaceState(null,"",a==="realtor"?location.pathname:"?for="+a);
    document.querySelectorAll("button[data-aud]").forEach(function(b){b.setAttribute("aria-pressed",b.dataset.aud===a?"true":"false")});
    q(".js-h1a").textContent=c.h1;q(".js-sub").textContent=c.sub;
    q(".js-input").placeholder=c.ph;q(".js-input2").placeholder=c.ph;
    q(".js-hook").textContent=c.hook;
    q(".js-facts").innerHTML=c.facts.map(function(f){return"<span>"+f+"</span>"}).join("");
    q(".js-s0").textContent=c.s0;q(".js-phlabel").textContent=c.label;
    q(".js-stat").innerHTML=c.stat;q(".js-src").textContent=c.src;
    q(".js-noun").textContent=c.noun;q(".js-photos").textContent=c.photos;
    q(".js-pain1").textContent=c.pain1;q(".js-fit1").textContent=c.fit1;
    q(".js-ddhook").textContent=c.dd;
    q(".js-input").value="";runDemo(false);
  }
  function clearT(){timers.forEach(clearTimeout);timers=[]}
  function at(ms,fn){timers.push(setTimeout(fn,ms))}
  function runDemo(typeLink){
    clearT();var build=q(".js-build"),items=build.querySelectorAll("li"),th=q(".js-thumbs").children;
    build.classList.remove("done");items.forEach(function(li){li.className=""});
    Array.prototype.forEach.call(th,function(t){t.classList.remove("in")});
    if(reduce){items.forEach(function(li){li.className="ok"});build.classList.add("done");return}
    var t=0;
    if(typeLink){var inp=q(".js-input"),s=copy[current].demo,i=0;inp.value="";
      (function type(){if(i<=s.length){inp.value=s.slice(0,i++);at(18,type)}})();t=s.length*18+300}
    at(t,function(){items[0].className="on"});
    for(var k=0;k<th.length;k++){(function(k){at(t+150+k*140,function(){th[k].classList.add("in")})})(k)}
    at(t+1500,function(){items[0].className="ok";items[1].className="on"});
    at(t+2500,function(){items[1].className="ok";items[2].className="on"});
    at(t+3600,function(){items[2].className="ok";items[3].className="ok"});
    at(t+4300,function(){build.classList.add("done")});
  }
  document.querySelectorAll("button[data-aud]").forEach(function(b){
    b.addEventListener("click",function(){setAud(b.dataset.aud)})
  });
  q(".js-form").addEventListener("submit",function(e){e.preventDefault();runDemo(!q(".js-input").value)});
  q(".js-form2").addEventListener("submit",function(e){
    e.preventDefault();scrollTo({top:0,behavior:reduce?"auto":"smooth"});at(500,function(){runDemo(true)})
  });
  // Swipe deck loop
  if(!reduce){
    var dd=q(".js-ddcard"),n=0;
    setInterval(function(){
      var dir=(n++%3===2)?1:-1;
      dd.style.transition="transform .45s ease, opacity .45s";
      dd.style.transform="translateX("+dir*130+"%) rotate("+dir*16+"deg)";
      dd.style.opacity="0";
      setTimeout(function(){dd.style.transition="none";dd.style.transform="";dd.style.opacity="1"},600)
    },2200)
  }
  // Sticky mobile CTA
  var sc=q(".js-sticky-cta"),hero=q(".v3hero");
  if(sc&&hero) new IntersectionObserver(function(e){sc.classList.toggle("on",!e[0].isIntersecting)}).observe(hero);
  // Init
  if(current!=="realtor") setAud(current);
  runDemo(true);
})();`;

// ---------------------------------------------------------------------------
// SVG helpers — inline SVGs used in multiple places
// ---------------------------------------------------------------------------
const CheckSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M5 12l5 5 9-10" />
  </svg>
);
const XSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function HomePageV3({ audience = 'realtor' }: { audience?: Audience }) {
  return (
    <>
      {/* Google Font — React 19 / Next.js 15+ hoists <link> to <head> */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Root wrapper — data-aud is set server-side from ?for= param so CSS hides
          non-audience content before any JS runs. JS updates this attribute on toggle. */}
      <div id="home-v3-root" data-aud={audience}>

        {/* PROMO BAR */}
        <div className="v3promo">
          Founding price: $249/month, locked for life for the first 50 businesses. Then $349.{' '}
          <a href="#offer">See the offer</a>
        </div>

        {/* NAV */}
        <header className="v3nav">
          <div className="v3wrap">
            <a className="v3logo" href="#top">NEXT<span>5</span></a>
            <nav className="v3nav-links" aria-label="Main">
              <a href="#offer">The offer</a>
              <a href="#guarantee">Guarantee</a>
              <a href="#faq">Questions</a>
            </nav>
            <div className="v3nav-right">
              <a className="v3login" href="/app/login">Log in</a>
              <a className="v3btn v3btn-sm" href="#top">Get my free video</a>
            </div>
          </div>
        </header>

        <main id="top">

          {/* ── HERO ── */}
          <section className="v3hero">
            <div className="v3wrap v3hero-grid">
              <div>
                <div className="v3aud" role="group" aria-label="I am a">
                  <button type="button" data-aud="realtor" aria-pressed={audience === 'realtor' ? 'true' : 'false'}>Realtor</button>
                  <button type="button" data-aud="service" aria-pressed={audience === 'service' ? 'true' : 'false'}>Home services</button>
                  <button type="button" data-aud="seller" aria-pressed={audience === 'seller' ? 'true' : 'false'}>TikTok Shop</button>
                </div>
                <h1>
                  <span className="js-h1a">
                    {audience === 'service' ? 'Every job, turned into a month of videos.' :
                     audience === 'seller' ? 'Every product, turned into a month of videos.' :
                     'Every listing, turned into a month of videos.'}
                  </span>
                  <span className="l2">Without filming a single one.</span>
                </h1>
                <p className="v3lede js-sub">
                  {audience === 'service'
                    ? 'Paste your website. In 2 minutes you\'re watching your first video. Your whole month is planned before your next service call.'
                    : audience === 'seller'
                    ? 'Paste your TikTok Shop link. In 2 minutes you\'re watching your first video. Your whole month is planned before your next restock.'
                    : 'Paste your Zillow link. In 2 minutes you\'re watching your first video. Your whole month is planned before you finish your coffee.'}
                </p>

                <form className="v3linkbox js-form" autoComplete="off">
                  <label htmlFor="link1">Your link</label>
                  <input
                    id="link1"
                    className="js-input"
                    type="url"
                    inputMode="url"
                    placeholder={
                      audience === 'service' ? 'yourbusiness.com' :
                      audience === 'seller' ? 'shop.tiktok.com/view/product/...' :
                      'zillow.com/homedetails/...'
                    }
                  />
                  <button className="v3btn v3btn-signal" type="submit">Make my free video</button>
                </form>

                <div className="v3fine">
                  <span><CheckSvg />Free video, no card</span>
                  <span><CheckSvg />2 minutes</span>
                  <span><CheckSvg />Keep it even if you never pay</span>
                </div>

                <div className="v3stars">
                  <span className="v3stat-pill js-stat">
                    {audience === 'service'
                      ? <><b>40%</b>{' '}of millennial homeowners use social media to find roofing contractors.</>
                      : audience === 'seller'
                      ? <><b>215,000+</b>{' '}US small businesses sell on TikTok Shop. Standing out takes volume.</>
                      : <><b>39%</b>{' '}of realtors say social media brings their best leads, more than any other tool.</>}
                  </span>
                  <span className="v3src js-src">
                    {audience === 'service' ? 'Roofing Contractor homeowner survey, 2025' :
                     audience === 'seller' ? 'TikTok Shop via Modern Retail, 2026' :
                     'NAR Technology Survey, 2025'}
                  </span>
                </div>
              </div>

              {/* Phone demo */}
              <div className="v3stage">
                <div className="v3phone">
                  <div className="v3phone-notch" />
                  <div className="v3phone-screen">
                    <div className="v3ph" data-kind="video" style={{ position: 'absolute', inset: 0 }}>
                      <div className="v3ph-label">
                        <svg width="12" height="12" viewBox="0 0 24 24">
                          <path d="M8 5l11 7-11 7z" fill="currentColor" />
                        </svg>
                        <span className="js-phlabel">Video: listing slideshow, 9:16</span>
                      </div>
                    </div>
                    <div className="v3video-ov">
                      <div>
                        <div className="v3hook js-hook">Wait till you see the kitchen.</div>
                        <div className="v3hookdots"><i className="on" /><i /><i /></div>
                      </div>
                      <div className="v3facts js-facts">
                        <span>$649,000</span><span>3 bd</span><span>2 ba</span><span>Austin, TX</span>
                      </div>
                    </div>
                    <div className="v3build js-build" aria-live="polite">
                      <h4>Making your video</h4>
                      <ul className="v3steps-live">
                        <li data-s="0"><i className="dot" /><span className="js-s0">Pulling your 24 listing photos</span></li>
                        <li data-s="1"><i className="dot" /><span>Writing your hook</span></li>
                        <li data-s="2"><i className="dot" /><span>Putting it together</span></li>
                        <li data-s="3"><i className="dot" /><span>Your video is ready</span></li>
                      </ul>
                      <div className="v3thumbs js-thumbs">
                        <div /><div /><div /><div /><div /><div /><div /><div />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="v3side-card v3timer">
                  <b>Time you spent</b>
                  <div className="big-n">0 min</div>
                  <span>filming, editing, writing captions</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── PAIN ── */}
          <section className="v3section">
            <div className="v3wrap">
              <div className="v3section-head">
                <h2>You know you should post every day.<br /><span className="v3muted">Here&rsquo;s why you don&rsquo;t.</span></h2>
              </div>
              <div className="v3pains">
                <div className="v3pain">
                  <div className="x"><XSvg /></div>
                  <h3>No time</h3>
                  <p className="js-pain1">Showings, calls, paperwork. Posting is always tomorrow.</p>
                  <div className="fix"><CheckSvg />We make every post for you.</div>
                </div>
                <div className="v3pain">
                  <div className="x"><XSvg /></div>
                  <h3>No idea what to post</h3>
                  <p>You open the app, stare at it, and close it again.</p>
                  <div className="fix"><CheckSvg />Your whole month is planned.</div>
                </div>
                <div className="v3pain">
                  <div className="x"><XSvg /></div>
                  <h3>You hate being on camera</h3>
                  <p>Filming yourself feels awkward, and it shows.</p>
                  <div className="fix"><CheckSvg />Made from your photos. No filming.</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 3 WAYS ── */}
          <section className="v3section">
            <div className="v3wrap">
              <div className="v3section-head">
                <h2>3 ways to get a month of videos.</h2>
                <p className="v3lede">Only one of them takes 3 minutes a week.</p>
              </div>
              <div className="v3ways">
                <div className="v3way">
                  <div className="v3way-t">Hire an agency</div>
                  <div className="v3way-p">$1,000+<small>/month</small></div>
                  <ul>
                    <li>Weeks to get started</li>
                    <li>Calls, briefs, revisions</li>
                    <li>Locked into a contract</li>
                  </ul>
                </div>
                <div className="v3way">
                  <div className="v3way-t">Do it yourself</div>
                  <div className="v3way-p">6+ hrs<small>/week</small></div>
                  <ul>
                    <li>Film, edit, write, repeat</li>
                    <li>Learn CapCut and trends</li>
                    <li>Quit by week 3</li>
                  </ul>
                </div>
                <div className="v3way win">
                  <div className="badge">Next5</div>
                  <div className="v3way-t">Paste a link</div>
                  <div className="v3way-p">3 min<small>/week</small></div>
                  <ul>
                    <li>First video in 2 minutes</li>
                    <li>Swipe to pick your posts</li>
                    <li>Cancel in 2 clicks</li>
                  </ul>
                </div>
              </div>
              <p className="v3note">
                Most businesses pay $1,000 to $3,000 a month for social media management (Sprout Social, WebFX, 2026).
                43% of small business owners spend 6+ hours a week on social media (VerticalResponse).
              </p>
            </div>
          </section>

          {/* ── SWIPE TEASER ── */}
          <section className="v3section">
            <div className="v3wrap v3swipe-grid">
              <div>
                <h2>Your only job: swipe.</h2>
                <p className="v3lede">
                  Every week we make options for each day. Swipe right on the one you like.
                  Swipe left and we show you another.
                </p>
                <ol className="v3mini-steps">
                  <li><b>1</b><span>Paste your link once.</span></li>
                  <li><b>2</b><span>Swipe through your week.</span></li>
                  <li><b>3</b><span>Post with the caption ready.</span></li>
                </ol>
              </div>
              <div className="v3deck-demo" aria-hidden="true">
                <div className="v3dd-day">Tuesday <span>6:30pm</span></div>
                <div className="v3dd-stack">
                  <div className="v3dd-card b2" />
                  <div className="v3dd-card b1" />
                  <div className="v3dd-card top js-ddcard">
                    <div className="v3ph" data-kind="video" style={{ position: 'absolute', inset: 0 }}>
                      <div className="v3ph-label">Video option</div>
                    </div>
                    <div className="v3dd-hook js-ddhook">You&rsquo;re gonna fall in love with this one.</div>
                  </div>
                </div>
                <div className="v3dd-btns">
                  <span className="v3dd-no">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </span>
                  <span className="v3dd-yes">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ── OFFER STACK ── */}
          <section className="v3section v3offer-sec" id="offer">
            <div className="v3wrap">
              <div className="v3section-head v3center">
                <h2>Here&rsquo;s everything you get.</h2>
                <p className="v3lede">Every month, for one price.</p>
              </div>
              <div className="v3stack">
                <div className="row">
                  <span><CheckSvg /><b>20 videos a month</b> made from your <span className="js-noun">listing</span> photos</span>
                  <span className="val">$800</span>
                </div>
                <div className="row">
                  <span><CheckSvg /><b>10 <span className="js-photos">photos of you</span></b> for the days between videos</span>
                  <span className="val">$400</span>
                </div>
                <div className="row">
                  <span><CheckSvg /><b>Your month planned</b>, one post for every day</span>
                  <span className="val">Included</span>
                </div>
                <div className="row">
                  <span><CheckSvg /><b>Hooks, captions and hashtags</b> written for every post</span>
                  <span className="val">Included</span>
                </div>
                <div className="row">
                  <span><CheckSvg /><b>Up to 5 options a day.</b> Swipe until you love it.</span>
                  <span className="val">Included</span>
                </div>
                <div className="row bonus">
                  <span><em>Bonus</em><b>Your first video free</b>, before you pay anything</span>
                  <span className="val">Free</span>
                </div>
                <div className="row bonus">
                  <span><em>Bonus</em><b>A 15-minute setup call</b> with the founder to plan your first month</span>
                  <span className="val">$100</span>
                </div>
                <div className="row bonus">
                  <span><em>Bonus</em><b>Profile makeover:</b> new bio and a pro headshot</span>
                  <span className="val">$150</span>
                </div>
                <div className="v3total"><span>Total value</span><s>$1,450</s></div>
                <div className="v3price-row">
                  <div>
                    <div className="v3today">Founding price, locked for life</div>
                    <div className="v3price-big">$249<small>/month</small></div>
                    <div className="v3per">That&rsquo;s about $8 a post. Goes to $349 after the first 50 businesses.</div>
                  </div>
                  <a className="v3btn v3btn-signal v3btn-lg" href="#top">Start with a free video</a>
                </div>
                <p className="v3vnote">Values use the low end of typical freelance rates of $40 to $150 per post (WebFX, 2026).</p>
              </div>
            </div>
          </section>

          {/* ── GUARANTEE ── */}
          <section className="v3section" id="guarantee">
            <div className="v3wrap">
              <div className="v3guar3">
                <div className="v3seal">
                  <div>30<small>DAY</small></div>
                </div>
                <div>
                  <h2>The Beat Your Feed Guarantee.</h2>
                  <p className="v3lede">
                    Post 12 Next5 videos in 30 days. If they don&rsquo;t get more views than your last 12 posts,
                    your next month is free. You check it in your own stats. No forms, no arguing.
                  </p>
                  <div className="v3g-mini">
                    <div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                      <div><b>Remake guarantee.</b> Any video looks off, we remake it free.</div>
                    </div>
                    <div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                      <div><b>Cancel in 2 clicks.</b> No contract, no call.</div>
                    </div>
                    <div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                      <div><b>Keep everything.</b> Every video you made is yours.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── NUMBERS ── */}
          <section className="v3section">
            <div className="v3wrap">
              <div className="v3section-head">
                <h2>The numbers don&rsquo;t lie.</h2>
                <p className="v3lede">Your customers are already scrolling. The only question is whether they see you.</p>
              </div>
              <div className="v3nums">
                {/* Realtor stats */}
                <div className="v3num" data-only="realtor">
                  <div className="n">39%</div>
                  <p>of realtors say social media brings their best leads. No other tool comes close.</p>
                  <a className="v3src" href="https://houstonagentmagazine.com/2025/09/19/nar-technology-survey/" rel="nofollow noopener" target="_blank">NAR Technology Survey, 2025</a>
                </div>
                <div className="v3num" data-only="realtor">
                  <div className="n">66%</div>
                  <p>of realtors adopt new tech for one reason: to save time.</p>
                  <a className="v3src" href="https://www.nar.realtor/research-and-statistics/research-reports/realtor-technology-survey" rel="nofollow noopener" target="_blank">NAR Technology Survey, 2025</a>
                </div>
                {/* Service stats */}
                <div className="v3num" data-only="service">
                  <div className="n">40%</div>
                  <p>of millennial homeowners use social media to find roofing contractors.</p>
                  <a className="v3src" href="https://digitaledition.roofingcontractor.com/may-2025/homeowner-survey/" rel="nofollow noopener" target="_blank">Roofing Contractor homeowner survey, 2025</a>
                </div>
                <div className="v3num" data-only="service">
                  <div className="n">67%</div>
                  <p>of homeowners say online reviews are very or extremely important when they hire.</p>
                  <a className="v3src" href="https://digitaledition.roofingcontractor.com/may-2025/homeowner-survey/" rel="nofollow noopener" target="_blank">Roofing Contractor homeowner survey, 2025</a>
                </div>
                {/* Seller stats */}
                <div className="v3num" data-only="seller">
                  <div className="n">215,000+</div>
                  <p>US small businesses now sell on TikTok Shop. That&rsquo;s who you compete with for views.</p>
                  <a className="v3src" href="https://www.modernretail.co/operations/tiktok-shop-says-sales-from-u-s-small-businesses-climbed-66-in-2025/" rel="nofollow noopener" target="_blank">TikTok Shop via Modern Retail, 2026</a>
                </div>
                <div className="v3num" data-only="seller">
                  <div className="n">+66%</div>
                  <p>sales growth for US small businesses on TikTok Shop in 2025.</p>
                  <a className="v3src" href="https://www.modernretail.co/operations/tiktok-shop-says-sales-from-u-s-small-businesses-climbed-66-in-2025/" rel="nofollow noopener" target="_blank">TikTok Shop via Modern Retail, 2026</a>
                </div>
                {/* Shared stat */}
                <div className="v3num">
                  <div className="n">6+ hrs</div>
                  <p>a week is what 43% of small business owners spend on social media. Next5 takes 3 minutes.</p>
                  <a className="v3src" href="https://verticalresponse.com/blog/how-much-time-should-your-small-business-spend-on-social-media-marketing/" rel="nofollow noopener" target="_blank">VerticalResponse survey</a>
                </div>
              </div>
            </div>
          </section>

          {/* ── FIT ── */}
          <section className="v3section">
            <div className="v3wrap v3fit">
              <div className="v3fit-col yes">
                <h3>This is for you if</h3>
                <ul>
                  <li>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
                    <span className="js-fit1">You have listings and want more people to see them</span>
                  </li>
                  <li>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
                    You know you should post more, but don&rsquo;t
                  </li>
                  <li>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
                    You&rsquo;d rather spend 3 minutes than 3 hours
                  </li>
                </ul>
              </div>
              <div className="v3fit-col no">
                <h3>This is not for you if</h3>
                <ul>
                  <li>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    You love filming and editing yourself
                  </li>
                  <li>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    You want a video editor with 100 buttons
                  </li>
                  <li>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    You&rsquo;re looking for someone to run your paid ads
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="v3section" id="faq">
            <div className="v3wrap">
              <div className="v3section-head"><h2>Still on the fence?</h2></div>
              <div className="v3faq">
                <details open>
                  <summary>What if the videos aren&rsquo;t good?</summary>
                  <p>Swipe left and we make another. If a video gets your business wrong, we remake it free. And your first one costs nothing, so you&rsquo;ll know before you pay.</p>
                </details>
                <details>
                  <summary>Will people know it&rsquo;s AI?</summary>
                  <p>Your videos use your real photos and your real details. Nothing is invented about your business.</p>
                </details>
                <details>
                  <summary>Do you post for me?</summary>
                  <p>Not yet. Today you post from your phone with the caption ready to copy. Posting for you is coming next, included in your plan.</p>
                </details>
                <details>
                  <summary>What do I need to start?</summary>
                  <p>One link. Your Zillow listing, your website, or your TikTok Shop product. That&rsquo;s it.</p>
                </details>
                <details>
                  <summary>Can I cancel?</summary>
                  <p>Anytime, in 2 clicks. No contract, no call. Every video you made stays yours.</p>
                </details>
              </div>
            </div>
          </section>

          {/* ── FINAL CTA ── */}
          <section className="v3final">
            <div className="v3wrap">
              <div className="v3final-box">
                <h2>You have two options.</h2>
                <div className="v3two">
                  <p><b>Option 1:</b> keep telling yourself you&rsquo;ll post next week.</p>
                  <p><b>Option 2:</b> paste your link and watch your first video in 2 minutes. Free.</p>
                </div>
                <form className="v3linkbox js-form2" autoComplete="off">
                  <label htmlFor="link2">Your link</label>
                  <input
                    id="link2"
                    className="js-input2"
                    type="url"
                    inputMode="url"
                    placeholder={
                      audience === 'service' ? 'yourbusiness.com' :
                      audience === 'seller' ? 'shop.tiktok.com/view/product/...' :
                      'zillow.com/homedetails/...'
                    }
                  />
                  <button className="v3btn" type="submit">Make my free video</button>
                </form>
                <p className="v3fine-w">No card. Keep the video even if you never pay.</p>
              </div>
            </div>
          </section>

        </main>

        {/* FOOTER */}
        <footer className="v3footer">
          <div className="v3wrap">
            <div>
              <span className="v3logo">NEXT<span>5</span></span>
              <p style={{ marginTop: '8px' }}>Videos and posts for realtors, home services and TikTok Shop sellers.</p>
            </div>
            <nav aria-label="Footer">
              <a href="/legal/terms">Terms</a>
              <a href="/legal/privacy">Privacy</a>
              <a href="mailto:hello@next5.ai">Contact</a>
            </nav>
          </div>
        </footer>

        {/* STICKY MOBILE CTA */}
        <div className="v3sticky-cta js-sticky-cta">
          <a className="v3btn v3btn-signal" href="#top">Make my free video</a>
        </div>

      </div>{/* end #home-v3-root */}

      <Script
        id="home-v3-js"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JS }}
      />
    </>
  );
}
