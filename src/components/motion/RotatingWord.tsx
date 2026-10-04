'use client';

import { useEffect, useRef, useState } from 'react';

const SWAP_MS = 2_600;

/** `previous` is the word that just left; null until the first swap, so nothing animates on load. */
type Swap = { index: number; previous: number | null };

/**
 * One headline word that swaps between `words` on a timer: the old word slides up and out, the next rises in from
 * below (keyframes in globals.css), and the slot width eases to fit so the rest of the line follows smoothly.
 * Wrapped in .split-w/.split-wi so a [data-intro-split] heading still raises it with the other words on load.
 * Reduced motion: the first word stays put. Screen readers get `label` once instead of the swapping words.
 */
export function RotatingWord({ words, label }: { words: string[]; label: string }) {
  const [{ index, previous }, setSwap] = useState<Swap>({ index: 0, previous: null });
  const [widths, setWidths] = useState<number[]>([]);
  const sizers = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setSwap((s) => ({ index: (s.index + 1) % words.length, previous: s.index })), SWAP_MS);
    return () => clearInterval(timer);
  }, [words.length]);

  // Font size changes with the breakpoint, so widths are re-measured whenever a word resizes.
  // Re-attached on each swap because the swapping words remount.
  useEffect(() => {
    const observer = new ResizeObserver(() => setWidths(sizers.current.map((el) => el?.offsetWidth ?? 0)));
    sizers.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [index]);

  const width = widths[index];
  return (
    <span>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="split-w">
        <span className="split-wi">
          {/* Slot: sized by an invisible copy of the current word, then by the measured width so it eases between words.
              The clip-path masks words above and below the line but lets a wide word spill sideways mid-swap. */}
          <span
            className="relative inline-block whitespace-nowrap align-top transition-[width] duration-500 ease-out [clip-path:inset(0_-50vw)] motion-reduce:transition-none"
            style={width ? { width } : undefined}
          >
            <span className="invisible">{words[index]}</span>
            {words.map((word, i) => (
              <span key={word} className={`absolute inset-y-0 left-1/2 -translate-x-1/2 ${i === index || i === previous ? '' : 'invisible'}`}>
                <span
                  // Keyed on the swap so the in/out keyframes restart each time.
                  key={index}
                  ref={(el) => { sizers.current[i] = el; }}
                  className={`inline-block ${i === index ? (previous === null ? '' : 'word-in') : i === previous ? 'word-out' : ''}`}
                >
                  {word}
                </span>
              </span>
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}
