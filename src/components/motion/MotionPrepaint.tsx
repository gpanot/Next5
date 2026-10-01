/**
 * Inline script that runs while the HTML parses, before first paint. It hides
 * hero intro elements so GSAP can bring them in without a flash. Skipped under
 * reduced motion. If the JS bundle never runs, CSS reveals them after 2.5s.
 * Navigation, the headline's accessible text and the CTA form are never hidden.
 */
const PREPAINT_JS = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.motion="pending"}catch(e){}`;

export function MotionPrepaint() {
  return <script dangerouslySetInnerHTML={{ __html: PREPAINT_JS }} />;
}
