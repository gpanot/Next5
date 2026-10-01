/**
 * Splits plain text into word spans for a staggered reveal, without hurting
 * accessibility: screen readers get the whole sentence from the sr-only copy,
 * the split words are aria-hidden. Words are fully visible without JS; GSAP only
 * animates them in when motion is allowed. Pass plain text only, never links.
 * Server-safe (no hooks), so server components can use it.
 */
export function SplitWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={className} data-split-text="">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="split-vis">
        {words.map((word, i) => (
          <span key={`${word}-${i}`}>
            <span className="split-w"><span className="split-wi">{word}</span></span>
            {i < words.length - 1 ? ' ' : null}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Same markup as <SplitWords>, as an HTML string, for the homepage's inline vanilla script. */
export const SPLIT_JS = String.raw`
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return"&#"+c.charCodeAt(0)+";"})}
  function setSplit(sel,text){
    var el=document.querySelector(sel);if(!el)return;
    var sr=el.querySelector(".sr-only"),vis=el.querySelector(".split-vis");
    if(!sr||!vis){el.textContent=text;return}
    sr.textContent=text;
    vis.innerHTML=text.split(/\s+/).filter(Boolean).map(function(w){
      return'<span><span class="split-w"><span class="split-wi">'+esc(w)+'</span></span></span>'}).join(" ");
    el.dispatchEvent(new CustomEvent("split:replay",{bubbles:true}));
  }
`;
