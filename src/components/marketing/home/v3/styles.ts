/**
 * Base CSS for homepage v3, ported from new website/next5-homepage-v3-final.html.
 * Element resets are wrapped in :where(#home-v3-root) so they carry zero ID
 * specificity. Without that, `#home-v3-root h2` beat `.v3guar3 h2` (black
 * heading on black box) and `#home-v3-root a` beat `.v3btn` (grey button text).
 * String.raw keeps CSS escapes such as \2212 intact.
 */
export const BASE_CSS = String.raw`
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
  --ease-out:cubic-bezier(.2,.7,.2,1);
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
#home-v3-root{background:var(--paper);color:var(--body);font-family:var(--font);font-size:17px;line-height:1.55;
  overflow-x:clip;padding-bottom:env(safe-area-inset-bottom,0px);-webkit-text-size-adjust:100%}
:where(#home-v3-root) img,:where(#home-v3-root) video{max-width:100%;display:block}
:where(#home-v3-root) a{color:inherit}
:where(#home-v3-root) :is(h1,h2,h3){color:var(--ink);margin:0;font-weight:800;letter-spacing:-0.035em;line-height:1.02}
:where(#home-v3-root) h2{font-size:clamp(30px,5.2vw,52px)}
:where(#home-v3-root) h3{font-size:21px;letter-spacing:-0.02em;line-height:1.2;font-weight:700}
:where(#home-v3-root) p{margin:0}
#home-v3-root :focus-visible{outline:3px solid var(--signal);outline-offset:3px;border-radius:6px}
#home-v3-root :is(a,button,summary){-webkit-tap-highlight-color:transparent}
.v3wrap{max-width:1160px;margin:0 auto;padding:0 20px}
.v3lede{font-size:19px;max-width:34em;margin-top:18px}
.v3section{padding:96px 0;border-top:1px solid var(--line)}
.v3section-head{max-width:640px;margin-bottom:48px}

/* buttons */
.v3btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:52px;padding:0 24px;border-radius:999px;border:0;
  background:var(--ink);color:var(--btn-ink);font:600 16px/1 var(--font);cursor:pointer;text-decoration:none;white-space:nowrap}
.v3btn-sm{height:40px;padding:0 16px;font-size:14px}
.v3btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.v3btn-signal{background:var(--signal);color:#fff}
.v3btn-lg{height:60px;padding:0 30px;font-size:17px}

/* nav */
.v3nav{position:sticky;top:0;z-index:20;padding-top:env(safe-area-inset-top,0px);background:color-mix(in srgb,var(--paper) 88%,transparent);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.v3nav .v3wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
.v3logo{font-weight:800;letter-spacing:.14em;color:var(--ink);text-decoration:none;font-size:17px;padding:10px 0}
.v3logo span{color:var(--signal)}
.v3nav-links{display:flex;gap:28px;font-size:15px}
.v3nav-links a{text-decoration:none;color:var(--body)}
.v3nav-links a:hover{color:var(--ink)}
.v3nav-right{display:flex;gap:10px;align-items:center}
.v3nav-right .v3login{font-size:15px;text-decoration:none;padding:0 8px}
@media (max-width:820px){.v3nav-links,.v3nav-right .v3login{display:none}}
@media (max-width:760px){.v3nav .v3wrap{height:58px}.v3btn-sm{height:44px}}

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
@media (max-width:900px){.v3hero-grid{grid-template-columns:1fr;gap:40px}}
.v3aud{display:inline-flex;padding:4px;border-radius:999px;background:var(--soft);margin-bottom:28px}
.v3aud button{border:0;background:transparent;font:600 14px/1 var(--font);color:var(--body);padding:0 16px;min-height:40px;border-radius:999px;cursor:pointer}
.v3aud button[aria-pressed="true"]{background:var(--paper);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.v3hero h1{font-size:clamp(40px,6.4vw,74px)}
.v3hero h1>span{display:block}
.v3hero h1 .l2{color:var(--signal);font-weight:800}
.v3linkbox{margin-top:32px;display:flex;gap:8px;padding:8px;border-radius:999px;border:1.5px solid var(--ink);background:var(--paper);max-width:560px}
.v3linkbox label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.v3linkbox input{flex:1;min-width:0;border:0;background:transparent;font:500 16px var(--font);color:var(--ink);padding:0 14px}
.v3linkbox input:focus{outline:none}
.v3linkbox:focus-within{box-shadow:0 0 0 4px color-mix(in srgb,var(--signal) 22%,transparent)}
@media (max-width:520px){
  .v3linkbox{flex-direction:column;border-radius:22px;padding:10px}
  .v3linkbox input{height:48px}
  .v3linkbox .v3btn{width:100%;height:54px}
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
.v3steps-live li{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--mute);transition:color .3s ease}
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
.v3video-ov{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;justify-content:space-between;padding:58px 16px 30px;pointer-events:none}
.v3hook{align-self:center;text-align:center;background:var(--paper);color:var(--ink);font-weight:800;font-size:19px;line-height:1.15;padding:8px 12px;border-radius:10px;max-width:92%;letter-spacing:-.02em}
.v3facts{display:flex;gap:6px;flex-wrap:wrap}
.v3facts span{background:rgba(0,0,0,.72);color:#fff;font-size:12px;font-weight:600;padding:5px 9px;border-radius:8px}
.v3hookdots{display:flex;justify-content:center;gap:6px;margin-top:10px}
.v3hookdots i{width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,.25)}
.v3hookdots i.on{background:var(--signal);width:18px;border-radius:4px}
.v3side-card{position:absolute;left:0;top:56%;background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:12px 14px;
  width:200px;box-shadow:0 14px 30px -18px rgba(0,0,0,.35);font-size:13px;z-index:4}
.v3side-card b{color:var(--ink);display:block;font-size:13.5px;margin-bottom:2px}
.v3timer .big-n{font-size:38px;font-weight:800;color:var(--ready);letter-spacing:-.04em;line-height:1.1;margin:2px 0}
@media (max-width:900px){
  .v3stage{flex-direction:column;align-items:center;padding-bottom:0}
  .v3side-card{position:relative;left:auto;top:auto;margin:16px auto 0;width:calc(100% - 40px);max-width:260px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .v3side-card b{width:100%}
  .v3timer .big-n{font-size:30px}
}
@media (max-width:520px){.v3stage .v3phone{max-width:236px;border-radius:36px;padding:8px}.v3phone-screen{border-radius:29px}}

/* PAINS */
.v3pains{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media (max-width:860px){.v3pains{grid-template-columns:1fr;gap:14px}}
.v3pain{border:1px solid var(--line);border-radius:24px;padding:26px;display:flex;flex-direction:column;background:var(--paper)}
.v3pain .x{width:34px;height:34px;border-radius:50%;background:var(--soft);color:var(--signal);display:grid;place-items:center;margin-bottom:16px}
.v3pain p{margin-top:8px;flex:1}
.v3pain .fix{margin-top:18px;padding-top:16px;border-top:1px solid var(--line);color:var(--ready);font-weight:600;display:flex;gap:8px;align-items:center}

/* WAYS */
.v3ways{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:stretch}
@media (max-width:860px){.v3ways{grid-template-columns:1fr;gap:14px}.v3way.win{margin-top:10px}}
.v3way{border:1px solid var(--line);border-radius:24px;padding:28px;position:relative;background:var(--paper)}
.v3way.win{border:2px solid var(--ink);box-shadow:0 24px 50px -30px rgba(0,0,0,.45)}
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
@media (max-width:860px){.v3swipe-grid{grid-template-columns:1fr;gap:40px}}
.v3mini-steps{list-style:none;padding:0;margin:28px 0 0;display:grid;gap:14px}
.v3mini-steps li{display:flex;gap:14px;align-items:center;font-size:18px;color:var(--ink);font-weight:500}
.v3mini-steps b{width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--btn-ink);display:grid;place-items:center;font-size:15px;flex:none}
.v3deck-demo{max-width:320px;margin:0 auto;width:100%}
@media (max-width:520px){.v3deck-demo{max-width:260px}}
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
.v3stack .item{display:flex;gap:10px;align-items:flex-start;min-width:0}
.v3stack .item svg{color:var(--ready);flex:none;margin-top:5px}
.v3stack .row b{color:var(--ink);font-weight:700}
.v3stack .val{font-weight:700;color:var(--ink);white-space:nowrap}
.v3stack .bonus em{font-style:normal;background:var(--signal);color:#fff;font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:6px;flex:none;margin-top:2px}
.v3total{display:flex;justify-content:space-between;padding:20px 0 6px;font-size:18px;font-weight:600;color:var(--ink)}
.v3total s{font-weight:800}
.v3price-row{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-top:12px;padding-top:20px;border-top:2px solid var(--ink)}
.v3today{font-size:14px;font-weight:600;color:var(--signal)}
.v3price-big{font-size:60px;font-weight:800;color:var(--ink);letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums}
.v3price-big small{font-size:18px;color:var(--mute);font-weight:500;letter-spacing:0}
.v3per{font-size:14px;color:var(--mute);margin-top:6px}
.v3vnote{margin:16px 0 0;font-size:12.5px;color:var(--mute)}
@media (max-width:600px){
  .v3stack{padding:6px 18px 22px;border-radius:24px}
  .v3stack .row{font-size:15.5px;padding:15px 0;gap:12px}
  .v3stack .bonus .item{flex-wrap:wrap;gap:6px 10px}
  .v3price-row .v3btn{width:100%}
}

/* GUARANTEE */
.v3guar3{display:grid;grid-template-columns:auto 1fr;gap:48px;align-items:center;background:var(--ink);color:color-mix(in srgb,var(--btn-ink) 78%,transparent);border-radius:36px;padding:56px}
.v3guar3 h2{color:var(--btn-ink)}
@media (max-width:760px){.v3guar3{grid-template-columns:1fr;padding:36px 24px;gap:24px;border-radius:28px}}
.v3seal{position:relative;width:150px;height:150px;border-radius:50%;display:grid;place-items:center;text-align:center;color:var(--btn-ink)}
.v3seal::before{content:"";position:absolute;inset:0;border-radius:50%;border:3px dashed var(--signal)}
.v3seal div{font-size:52px;font-weight:800;line-height:.9;letter-spacing:-.04em}
.v3seal small{display:block;font-size:14px;letter-spacing:.2em;font-weight:700;color:var(--signal);margin-top:6px}
@media (max-width:760px){.v3seal{width:108px;height:108px}.v3seal div{font-size:38px}.v3seal small{font-size:12px}}
.v3g-mini{display:grid;gap:10px;margin-top:24px}
.v3g-mini>div{display:flex;gap:10px;align-items:flex-start}
.v3g-mini svg{color:#6FD39A;flex:none;margin-top:5px}
.v3g-mini b{color:var(--btn-ink)}

/* NUMBERS */
.v3nums{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media (max-width:860px){.v3nums{grid-template-columns:1fr;gap:14px}}
.v3num{border:1px solid var(--line);border-radius:24px;padding:28px;display:flex;flex-direction:column;background:var(--paper)}
.v3num .n{font-size:clamp(48px,6vw,68px);font-weight:800;letter-spacing:-.05em;color:var(--ink);line-height:1;font-variant-numeric:tabular-nums}
.v3num p{margin:12px 0 16px;font-size:16.5px;color:var(--ink);flex:1}
.v3src{font-size:12px;color:var(--mute)}

/* FIT */
.v3fit{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media (max-width:760px){.v3fit{grid-template-columns:1fr;gap:14px}}
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
.v3faq summary{list-style:none;cursor:pointer;padding:18px 0;color:var(--ink);font-weight:600;font-size:18px;display:flex;justify-content:space-between;align-items:center;gap:20px}
.v3faq summary::-webkit-details-marker{display:none}
.v3faq summary::after{content:"+";font-weight:400;font-size:26px;line-height:1;color:var(--mute);flex:none}
.v3faq details p{padding:0 0 20px;max-width:40em}

/* FINAL */
.v3final{padding:0 0 96px}
.v3final-box{background:var(--ink);border-radius:36px;padding:64px 40px;color:color-mix(in srgb,var(--btn-ink) 75%,transparent)}
.v3final-box h2{color:var(--btn-ink);max-width:14em}
.v3final-box .v3linkbox{border-color:var(--btn-ink);background:var(--btn-ink)}
.v3final-box .v3linkbox input{color:var(--ink)}
.v3final-box .v3linkbox .v3btn{background:var(--signal);color:#fff}
@media (max-width:600px){.v3final-box{padding:40px 20px;border-radius:28px}}
.v3two{display:grid;gap:10px;margin:22px 0 8px;font-size:18px}
.v3two b{color:var(--btn-ink)}
.v3fine-w{margin-top:14px;font-size:14px}

/* FOOTER */
.v3footer{border-top:1px solid var(--line);padding:40px 0 56px;font-size:14px;color:var(--mute)}
.v3footer .v3wrap{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}
.v3footer nav{display:flex;gap:22px;flex-wrap:wrap}
.v3footer nav a{text-decoration:none;padding:12px 0}
@media (max-width:760px){.v3footer{padding-bottom:110px}}

/* STICKY CTA */
.v3sticky-cta{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:30;transform:translateY(150%);transition:transform .35s var(--ease-out);display:none}
.v3sticky-cta .v3btn{width:100%;height:54px;box-shadow:0 14px 30px -12px rgba(0,0,0,.5)}
.v3sticky-cta.on{transform:none}
@media (max-width:760px){.v3sticky-cta{display:block}}

/* PROMO BAR */
.v3promo{background:var(--ink);color:var(--btn-ink);text-align:center;font-size:14px;padding:9px 16px;line-height:1.4}
.v3promo a{color:var(--btn-ink);font-weight:700;margin-left:6px;white-space:nowrap}
.v3promo .long{display:inline}
.v3promo .short{display:none}
@media (max-width:600px){.v3promo{font-size:13px}.v3promo .long{display:none}.v3promo .short{display:inline}}

/* SHARED UTILS */
.v3stars{margin-top:22px;font-size:14.5px;color:var(--body);display:flex;gap:8px;align-items:flex-start;flex-direction:column;max-width:470px}
.v3stars b{color:var(--ink)}
.v3stat-pill b{font-size:17px;color:var(--signal)}
.v3muted{color:var(--mute)}
.v3center{margin-left:auto;margin-right:auto;text-align:center}
.v3center .v3lede{margin-left:auto;margin-right:auto}

/* MOBILE RHYTHM */
@media (max-width:760px){
  .v3hero{padding:28px 0 64px}
  .v3section{padding:64px 0}
  .v3section-head{margin-bottom:32px}
  .v3lede{font-size:17.5px;margin-top:14px}
  .v3final{padding-bottom:64px}
  .v3aud{margin-bottom:22px}
  .v3linkbox{margin-top:26px}
}

/* AUDIENCE VISIBILITY — key rule: uses root div data-aud, not body */
[data-aud="realtor"] [data-only]:not([data-only~="realtor"]),
[data-aud="service"] [data-only]:not([data-only~="service"]),
[data-aud="seller"] [data-only]:not([data-only~="seller"]){display:none!important}

@media (max-width:420px){.v3aud{display:flex;width:100%}.v3aud button{flex:1;padding:0 6px;min-height:44px;font-size:13px}}
`;
