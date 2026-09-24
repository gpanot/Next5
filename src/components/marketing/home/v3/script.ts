/**
 * Inline vanilla JS for homepage v3 (the page stays a server component).
 * Handles: audience toggle, hero build demo, link forms, swipe deck loop,
 * scroll reveals, count-ups, nav shadow and the sticky mobile CTA.
 * Audience copy is injected as JSON from copy.ts so server and client agree.
 */
import { AUDIENCE_COPY } from './copy';

const CORE_JS = String.raw`
  var q=function(s){return document.querySelector(s)};
  var qa=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
  var root=document.getElementById("home-v3-root");
  var timers=[],hookTimer=0,reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var urlAud=(new URLSearchParams(location.search).get("for")||"").toLowerCase();
  var current=copy[urlAud]?urlAud:"realtor";

  function setText(sel,v){var el=q(sel);if(el)el.textContent=v}
  function setAud(a){
    current=a;var c=copy[a];
    root.setAttribute("data-aud",a);
    history.replaceState(null,"",a==="realtor"?location.pathname:"?for="+a);
    qa("button[data-aud]").forEach(function(b){b.setAttribute("aria-pressed",b.dataset.aud===a?"true":"false")});
    setText(".js-h1a",c.h1);setText(".js-sub",c.sub);
    q(".js-input").placeholder=c.ph;q(".js-input2").placeholder=c.ph;
    setText(".js-hook",c.hooks[0]);
    q(".js-facts").innerHTML=c.facts.map(function(f){return"<span>"+f+"</span>"}).join("");
    setText(".js-s0",c.s0);setText(".js-phlabel",c.label);
    setText(".js-statnum",c.statNum);setText(".js-stattext"," "+c.statText);setText(".js-src",c.src);
    setText(".js-noun",c.noun);setText(".js-photos",c.photos);
    setText(".js-pain1",c.pain1);setText(".js-fit1",c.fit1);setText(".js-ddhook",c.dd);
    q(".js-input").value="";runDemo(false);
  }
  function clearT(){timers.forEach(clearTimeout);timers=[];clearInterval(hookTimer)}
  function at(ms,fn){timers.push(setTimeout(fn,ms))}
  function cycleHooks(){
    var hook=q(".js-hook"),dots=qa(".v3hookdots i"),n=0;
    hookTimer=setInterval(function(){
      n=(n+1)%copy[current].hooks.length;hook.classList.add("swap");
      setTimeout(function(){
        hook.textContent=copy[current].hooks[n];hook.classList.remove("swap");
        dots.forEach(function(d,i){d.classList.toggle("on",i===n)});
      },350);
    },2800);
  }
  function runDemo(typeLink){
    clearT();var build=q(".js-build"),items=build.querySelectorAll("li"),th=q(".js-thumbs").children,card=q(".v3side-card");
    build.classList.remove("done");card.classList.remove("done");items.forEach(function(li){li.className=""});
    Array.prototype.forEach.call(th,function(t){t.classList.remove("in")});
    qa(".v3hookdots i").forEach(function(d,i){d.classList.toggle("on",i===0)});
    setText(".js-hook",copy[current].hooks[0]);
    if(reduce){items.forEach(function(li){li.className="ok"});build.classList.add("done");return}
    var t=0;
    if(typeLink){var inp=q(".js-input"),s=copy[current].demo,i=0;inp.value="";
      (function type(){if(i<=s.length){inp.value=s.slice(0,i++);at(18,type)}})();t=s.length*18+300}
    at(t,function(){items[0].className="on"});
    for(var k=0;k<th.length;k++){(function(k){at(t+150+k*140,function(){th[k].classList.add("in")})})(k)}
    at(t+1500,function(){items[0].className="ok";items[1].className="on"});
    at(t+2500,function(){items[1].className="ok";items[2].className="on"});
    at(t+3600,function(){items[2].className="ok";items[3].className="ok"});
    at(t+4300,function(){build.classList.add("done");card.classList.add("done");
      if(typeLink){q(".js-input").value=""}cycleHooks()});
  }
  qa("button[data-aud]").forEach(function(b){b.addEventListener("click",function(){setAud(b.dataset.aud)})});
  function submitLink(val){
    try{localStorage.setItem("next5-landing-link",val)}catch(x){}
    location.href=(current==="seller"?"/start/shop":"/start/brand")+"?link="+encodeURIComponent(val);
  }
  q(".js-form").addEventListener("submit",function(e){
    e.preventDefault();var val=q(".js-input").value.trim();
    if(!val||val===copy[current].demo){runDemo(true);return}
    submitLink(val);
  });
  q(".js-form2").addEventListener("submit",function(e){
    e.preventDefault();var val=q(".js-input2").value.trim();
    if(!val){scrollTo({top:0,behavior:reduce?"auto":"smooth"});at(500,function(){runDemo(true)});return}
    submitLink(val);
  });
`;

const MOTION_JS = String.raw`
  function swipeDeck(){
    var dd=q(".js-ddcard"),yes=q(".v3dd-yes"),no=q(".v3dd-no"),n=0,loop=0;
    if(!dd||reduce)return;
    function step(){
      var right=(n++%3!==2),btn=right?yes:no,dir=right?1:-1;
      btn.classList.add("hit");setTimeout(function(){btn.classList.remove("hit")},450);
      dd.style.transition="transform .5s cubic-bezier(.2,.7,.2,1), opacity .5s";
      dd.style.transform="translateX("+dir*120+"%) rotate("+dir*14+"deg)";dd.style.opacity="0";
      setTimeout(function(){
        dd.style.transition="none";dd.style.transform="translateY(10px) scale(.95)";dd.style.opacity="1";
        requestAnimationFrame(function(){requestAnimationFrame(function(){
          dd.style.transition="transform .35s cubic-bezier(.2,.7,.2,1)";dd.style.transform="";
        })});
      },520);
    }
    new IntersectionObserver(function(e){
      if(e[0].isIntersecting&&!loop){loop=setInterval(step,2400)}
      else if(!e[0].isIntersecting&&loop){clearInterval(loop);loop=0}
    }).observe(dd);
  }
  function countUp(el){
    var raw=el.getAttribute("data-count-to")||el.textContent,m=raw.match(/^([^0-9]*)([0-9][0-9,]*)(.*)$/);
    if(!m)return;el.setAttribute("data-count-to",raw);
    var end=parseInt(m[2].replace(/,/g,""),10),comma=m[2].indexOf(",")>-1,t0=0,dur=1100;
    function fmt(v){var s=String(v);return comma?s.replace(/\B(?=(\d{3})+(?!\d))/g,","):s}
    function frame(ts){if(!t0)t0=ts;var p=Math.min(1,(ts-t0)/dur),e=1-Math.pow(1-p,3);
      el.textContent=m[1]+fmt(Math.round(end*e))+m[3];if(p<1)requestAnimationFrame(frame)}
    requestAnimationFrame(frame);
  }
  function reveals(){
    var els=qa("[data-reveal]"),vh=innerHeight;
    els.forEach(function(el){var r=el.getBoundingClientRect();if(r.top<vh&&r.bottom>0)el.classList.add("in")});
    root.classList.add("v3js");
    var io=new IntersectionObserver(function(entries){entries.forEach(function(en){
      if(!en.isIntersecting)return;en.target.classList.add("in");io.unobserve(en.target);
      qa("[data-count]").forEach(function(c){if(en.target.contains(c)&&!c.dataset.done){c.dataset.done="1";countUp(c)}});
    })},{rootMargin:"0px 0px -8% 0px",threshold:.12});
    els.forEach(function(el){if(!el.classList.contains("in"))io.observe(el)});
  }
  function chrome(){
    var nav=q(".v3nav"),sc=q(".js-sticky-cta"),form=q(".js-form"),fin=q(".v3final-box"),formOut=false,finIn=false;
    function upd(){sc.classList.toggle("on",formOut&&!finIn)}
    addEventListener("scroll",function(){nav.classList.toggle("scrolled",scrollY>8)},{passive:true});
    new IntersectionObserver(function(e){formOut=!e[0].isIntersecting&&e[0].boundingClientRect.top<0;upd()}).observe(form);
    new IntersectionObserver(function(e){finIn=e[0].isIntersecting;upd()}).observe(fin);
  }
  qa('a.v3btn[href="#top"]').forEach(function(a){a.addEventListener("click",function(e){
    var inp=q(".js-input");if(!inp)return;e.preventDefault();
    inp.focus({preventScroll:true});inp.scrollIntoView({block:"center",behavior:reduce?"auto":"smooth"});
  })});
  chrome();swipeDeck();
  if(!reduce)reveals();
  // Start the build demo when the phone is on screen. On phones it sits below
  // the fold, so running it on load would finish before anyone sees it.
  var demoIO=new IntersectionObserver(function(e){
    if(!e[0].isIntersecting)return;demoIO.disconnect();
    var r=q(".js-form").getBoundingClientRect();runDemo(r.top>=0&&r.bottom<=innerHeight);
  },{threshold:.35});
  demoIO.observe(q(".v3stage .v3phone"));
`;

export function buildHomeScript(): string {
  return `(function(){var copy=${JSON.stringify(AUDIENCE_COPY)};${CORE_JS}${MOTION_JS}})();`;
}
