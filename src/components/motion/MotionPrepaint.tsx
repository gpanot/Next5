'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { useRef } from 'react';

/**
 * Inline script that runs while the HTML parses, before first paint. It hides
 * hero intro elements so GSAP can bring them in without a flash. Skipped under
 * reduced motion. If the JS bundle never runs, CSS reveals them after 2.5s.
 * Navigation, the headline's accessible text and the CTA form are never hidden.
 */
const PREPAINT_JS = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.motion="pending"}catch(e){}`;

/**
 * Injected into the server HTML stream only. React never creates the script on the
 * client (it would not run there and React 19 warns about it on client navigation).
 */
export function MotionPrepaint() {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: PREPAINT_JS }} />;
  });
  return null;
}
