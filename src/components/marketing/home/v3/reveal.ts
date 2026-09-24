import type { CSSProperties } from 'react';

/**
 * Props that opt an element into the scroll reveal. `index` staggers siblings
 * (90ms each). See motionStyles.ts for the CSS and script.ts for the observer.
 */
export function reveal(index = 0): { 'data-reveal': ''; style: CSSProperties } {
  return { 'data-reveal': '', style: { '--i': index } as CSSProperties };
}
