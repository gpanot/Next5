'use client';

import { useEffect, useState } from 'react';

type TypewriterTextProps = {
  text: string;
  /** ms per character */
  speed?: number;
  className?: string;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Types `text` out a character at a time on mount. `text` is only read once
 *  (the interval closes over it) — pass a `key` that changes with the text
 *  at the call site if the same instance needs to replay for new text. */
export const TypewriterText = ({ text, speed = 22, className = '' }: TypewriterTextProps) => {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? text : ''));

  useEffect(() => {
    if (!text || prefersReducedMotion()) return;

    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, speed);

    return () => clearInterval(timer);
    // Deliberately runs once per mount — see the component doc comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span className={className}>{shown}</span>;
};
